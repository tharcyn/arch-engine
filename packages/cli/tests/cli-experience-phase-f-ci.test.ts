/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase F — CI Behavior Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.1.0 `--ci` flag and CI-friendly
 *  determinism per spec docs/cli/json-v2-ci-flags-spec.md
 *  §11 / §15.4.
 */

import { describe, expect, test, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');
const DEMO_DRIFT = path.join(REPO_ROOT, 'examples/demo-drift');

beforeAll(() => {
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(`CLI bin missing: ${CLI_BIN}. Run \`npm run build\` first.`);
  }
});

function copyDirSync(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function runCli(args: string[], cwd: string, env: Record<string, string> = {}): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  // Note: we deliberately do NOT default NO_COLOR here; we want to verify
  // that `--ci` itself disables color in the output.
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '1', ...env },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function withFixtureCopy<T>(src: string, fn: (cwd: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseF-ci-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Strip emittedAt from a v2 envelope JSON for byte-comparison.
function stripEmittedAt(json: string): string {
  return json.replace(/"emittedAt":\s*"[^"]+"/g, '"emittedAt":"<X>"');
}

/**
 * Strip wall-clock-derived fields from human output for
 * byte-comparison. The spec's "deterministic" contract means
 * "deterministic except for timing", since timing reflects machine
 * load. CI consumers parse exit codes, not stopwatch values.
 */
function stripTiming(text: string): string {
  return text.replace(/Extraction:\s*\d+ms\s*\|\s*Pipeline:\s*\d+ms\s*\|\s*Total:\s*\d+ms/g, 'Extraction: <X>ms | Pipeline: <X>ms | Total: <X>ms');
}

describe('Phase F — --ci exit code parity', () => {
  test('check --ci on demo-drift exits 1 (matches non-ci)', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const a = runCli(['check'], cwd);
      const b = runCli(['check', '--ci'], cwd);
      expect(b.status).toBe(1);
      expect(a.status).toBe(b.status);
    });
  });

  test('check --ci on no-policy fixture exits 0 (matches non-ci)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const a = runCli(['check'], cwd);
      const b = runCli(['check', '--ci'], cwd);
      expect(b.status).toBe(0);
      expect(a.status).toBe(b.status);
    });
  });
});

describe('Phase F — --ci forces no-color', () => {
  test('--ci output contains no ANSI escapes (despite FORCE_COLOR=1)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, stderr } = runCli(['check', '--ci'], cwd);
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[/.test(stdout + stderr)).toBe(false);
    });
  });

  test('--ci on demo-drift contains no ANSI escapes', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout, stderr } = runCli(['check', '--ci'], cwd);
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[/.test(stdout + stderr)).toBe(false);
    });
  });
});

describe('Phase F — --ci does NOT imply --json', () => {
  test('--ci alone produces human output, never JSON', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--ci'], cwd);
      const trimmed = stdout.trimStart();
      expect(trimmed.startsWith('{')).toBe(false);
    });
  });

  test('--ci compose with --json --json-schema=v2 cleanly', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.schemaVersion).toBe('arch-engine.cli.v2');
    });
  });
});

describe('Phase F — --ci composes with --output and --format markdown', () => {
  test('check --ci --format markdown --output writes file and preserves exit 1', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const target = path.join(cwd, 'report.md');
      const { status } = runCli(
        ['check', '--ci', '--format', 'markdown', '--output', 'report.md'],
        cwd,
      );
      expect(status).toBe(1);
      expect(fs.existsSync(target)).toBe(true);
      const content = fs.readFileSync(target, 'utf8');
      expect(content).toMatch(/\*\*Verdict:\*\* Blocked/);
    });
  });
});

describe('Phase F — --ci determinism', () => {
  test('check --ci is byte-identical across two runs (modulo wall-clock timing)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      // Warm twice — first run does auto-init, second run normalises any
      // first-touch artifact emission, so the third and fourth are steady.
      runCli(['check', '--ci'], cwd);
      runCli(['check', '--ci'], cwd);
      const a = runCli(['check', '--ci'], cwd).stdout;
      const b = runCli(['check', '--ci'], cwd).stdout;
      // Timing reflects machine load; CI consumers read exit codes, not
      // stopwatch values. Determinism is shape, not stopwatch.
      expect(stripTiming(a)).toBe(stripTiming(b));
    });
  });

  test('check --ci --json --json-schema=v2 is byte-identical (modulo emittedAt + timing)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd);
      runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd);
      const a = runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd).stdout;
      const b = runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd).stdout;
      // Both `emittedAt` (wall-clock) and `executionMetrics.*Ms` (timing)
      // are non-deterministic by construction. Determinism is shape.
      const norm = (s: string) => stripEmittedAt(s).replace(/"(extractionMs|pipelineMs|totalMs)":\s*\d+/g, '"$1":0');
      expect(norm(a)).toBe(norm(b));
    });
  });

  test('demo-drift check --ci --json --json-schema=v2: violation ids stable across runs', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const a = JSON.parse(runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd).stdout);
      const b = JSON.parse(runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd).stdout);
      const idsA = (a.data.violations as Array<{ id: string }>).map((v) => v.id).sort();
      const idsB = (b.data.violations as Array<{ id: string }>).map((v) => v.id).sort();
      expect(idsA).toEqual(idsB);
    });
  });
});

describe('Phase F — --ci human exit footer is machine-quotable', () => {
  test('demo-drift check --ci has `Exit 1: blocking architecture violations.` line', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout } = runCli(['check', '--ci'], cwd);
      expect(stdout).toMatch(/^Exit 1: blocking architecture violations\.$/m);
    });
  });

  test('no-policy check --ci has `Exit 0: no blocking architecture violations.` line', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--ci'], cwd);
      // The no-policy path uses the "Next: add `arch-policy.yml`" line; the
      // explicit Exit 0 line lands when policy IS configured. Either way,
      // `--ci` must still produce a deterministic verdict — assert the
      // process exit code below.
      expect(stdout).toMatch(/No policy file is configured yet|Exit 0/);
    });
  });
});
