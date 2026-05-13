/**
 * ═══════════════════════════════════════════════════════════
 *  agp-verify CLI tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Spawns the built CLI binary at `dist/cli.js` and asserts:
 *    - --help exits 0 with non-empty usage
 *    - --version exits 0 and prints the version line
 *    - missing --bundle exits 2 with AGP_VERIFIER_BUNDLE_NOT_FOUND
 *    - a real emitted bundle verifies, human + JSON output, exit 0
 *    - a tampered bundle exits 1
 *    - an unsupported_schema bundle exits 2
 *    - a non-existent bundle path exits 2 with BUNDLE_NOT_FOUND
 *    - no stack traces on stderr (DEBUG off)
 *
 *  Uses temp dirs created with mkdtemp; clean on each case.
 */

import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { emitAgpBundle } from '@arch-engine/agp-emitter';

const PKG_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.resolve(PKG_ROOT, 'dist', 'cli.js');
const EMITTER_FIXTURES = path.resolve(
  __dirname,
  '..',
  '..',
  'agp-emitter',
  'tests',
  'fixtures',
  'input',
);

function run(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const out = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEBUG: '' }, // silence stack traces
  });
  return {
    exitCode: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
  };
}

function emitBundleToDir(fixture = 'minimal-monorepo.json'): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verifier-cli-'));
  const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, fixture));
  const parsed = JSON.parse(raw.toString('utf8'));
  const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
  fs.writeFileSync(path.join(tmp, 'snapshot.json'), bundle.snapshotJson);
  fs.writeFileSync(path.join(tmp, 'records.ndjson'), bundle.recordsNdjson);
  return tmp;
}

const tempDirs: string[] = [];
function track<T extends string>(d: T): T {
  tempDirs.push(d);
  return d;
}

beforeAll(() => {
  if (!fs.existsSync(CLI_PATH)) {
    throw new Error(
      `agp-verifier dist/cli.js not built. Run \`npx tsup\` in packages/agp-verifier first.`,
    );
  }
});

afterEach(() => {
  for (const d of tempDirs.splice(0)) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('agp-verify CLI — flags', () => {
  test('--help exits 0 and prints usage', () => {
    const r = run(['--help']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/agp-verify/);
    expect(r.stdout).toMatch(/--bundle/);
  });

  test('--version exits 0 and prints the package version', () => {
    const r = run(['--version']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/@arch-engine\/agp-verifier 0\.1\.0/);
  });

  test('missing --bundle argument exits 2 and reports BUNDLE_NOT_FOUND', () => {
    const r = run([]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toMatch(/AGP_VERIFIER_BUNDLE_NOT_FOUND/);
    expect(r.stderr).not.toMatch(/at \w+/); // no stack trace
  });

  test('nonexistent bundle path exits 2', () => {
    const r = run([
      '--bundle',
      path.join(os.tmpdir(), 'agp-verifier-bogus-' + Date.now()),
    ]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toMatch(/BUNDLE_NOT_FOUND|not found/);
  });
});

describe('agp-verify CLI — valid bundle', () => {
  test('valid bundle: exit 0 with human output', () => {
    const dir = track(emitBundleToDir());
    const r = run(['--bundle', dir]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/AGP bundle verification/);
    expect(r.stdout).toMatch(/Verdict:\s+valid\b/);
    expect(r.stdout).toMatch(/Snapshot:\s+sha256:/);
    expect(r.stderr).toBe('');
  });

  test('valid bundle --json: exit 0 with parseable JSON', () => {
    const dir = track(emitBundleToDir());
    const r = run(['--bundle', dir, '--json']);
    expect(r.exitCode).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.verdict).toBe('valid');
    expect(parsed.valid).toBe(true);
    expect(typeof parsed.summary.totalRecords).toBe('number');
    expect(parsed.summary.algorithms.recordPayload).toBe('b3');
    expect(parsed.summary.algorithms.snapshotDigest).toBe('sha256');
  });
});

describe('agp-verify CLI — tampered bundle', () => {
  test('tampered snapshot digest: exit 1', () => {
    const dir = track(emitBundleToDir());
    // Mutate the snapshot digest in-place.
    const snapPath = path.join(dir, 'snapshot.json');
    const text = fs.readFileSync(snapPath, 'utf8');
    const tampered = text.replace(
      /"snapshotDigest":"sha256:[0-9a-f]{64}"/,
      `"snapshotDigest":"sha256:${'b'.repeat(64)}"`,
    );
    fs.writeFileSync(snapPath, tampered);

    const r = run(['--bundle', dir, '--json']);
    expect(r.exitCode).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.verdict).toBe('tampered');
    expect(parsed.issues.some((i: any) => i.code === 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH')).toBe(true);
  });
});

describe('agp-verify CLI — unsupported_schema bundle', () => {
  test('agpVersion bumped to 2.0.0: exit 2', () => {
    const dir = track(emitBundleToDir());
    const snapPath = path.join(dir, 'snapshot.json');
    const text = fs.readFileSync(snapPath, 'utf8');
    const bumped = text.replace(/"agpVersion":"1\.0\.0"/, '"agpVersion":"2.0.0"');
    fs.writeFileSync(snapPath, bumped);

    const r = run(['--bundle', dir, '--json']);
    expect(r.exitCode).toBe(2);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.verdict).toBe('unsupported_schema');
  });
});

describe('agp-verify CLI — no stack traces by default', () => {
  test('forcing internal error path does not leak a stack', () => {
    // Pass a path that exists but is a file, not a directory.
    const tmp = path.join(
      os.tmpdir(),
      `agp-cli-file-${Date.now()}.txt`,
    );
    fs.writeFileSync(tmp, 'hi');
    try {
      const r = run(['--bundle', tmp]);
      expect(r.exitCode).toBe(2);
      // No JS-engine stack lines on stderr.
      expect(r.stderr).not.toMatch(/^ {2,4}at \S/m);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
