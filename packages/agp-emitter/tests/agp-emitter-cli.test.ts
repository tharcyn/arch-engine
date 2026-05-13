/**
 * ═══════════════════════════════════════════════════════════
 *  CLI tests for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Exercises the `agp-emit` binary end-to-end via execFileSync.
 *  The binary is built from `src/cli.ts` into `dist/cli.js`.
 *
 *  Test outputs are written into `mktemp -d` directories that are
 *  cleaned up at the end of each test. No artifacts touch the
 *  Arch-Engine repo.
 */

import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const PKG_ROOT = path.resolve(__dirname, '..');
const CLI_BIN = path.join(PKG_ROOT, 'dist', 'cli.js');
const FIX_DIR = path.join(__dirname, 'fixtures', 'input');
const INVALID_FIX_DIR = path.join(__dirname, 'fixtures', 'invalid-input');

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agp-emit-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runCli(args: ReadonlyArray<string>): { exit: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [CLI_BIN, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exit: 0, stdout, stderr: '' };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      exit: e.status ?? -1,
      stdout: e.stdout?.toString('utf8') ?? '',
      stderr: e.stderr?.toString('utf8') ?? '',
    };
  }
}

describe('agp-emit CLI', () => {
  test('--help prints usage and exits 0', () => {
    const r = runCli(['--help']);
    expect(r.exit).toBe(0);
    expect(r.stdout).toContain('agp-emit');
    expect(r.stdout).toContain('--from');
    expect(r.stdout).toContain('--output');
  });

  test('--version prints emitter version and exits 0', () => {
    const r = runCli(['--version']);
    expect(r.exit).toBe(0);
    expect(r.stdout).toContain('0.1.0');
  });

  test('missing --from exits 2 with structured error', () => {
    const out = tempDir();
    try {
      const r = runCli(['--output', out]);
      expect(r.exit).toBe(2);
      expect(r.stderr).toContain('AGP_EMITTER_INPUT_PARSE_FAILED');
      expect(r.stderr).toContain('Missing required --from');
    } finally {
      cleanup(out);
    }
  });

  test('missing --output exits 2 with structured error', () => {
    const r = runCli(['--from', path.join(FIX_DIR, 'minimal-monorepo.json')]);
    expect(r.exit).toBe(2);
    expect(r.stderr).toContain('AGP_EMITTER_INPUT_PARSE_FAILED');
    expect(r.stderr).toContain('Missing required --output');
  });

  test('--from <valid> --output <dir> writes snapshot.json + records.ndjson and exits 0', () => {
    const out = tempDir();
    try {
      const r = runCli([
        '--from',
        path.join(FIX_DIR, 'minimal-monorepo.json'),
        '--output',
        out,
        '--deterministic',
      ]);
      expect(r.exit).toBe(0);
      const snapshotPath = path.join(out, 'snapshot.json');
      const recordsPath = path.join(out, 'records.ndjson');
      expect(fs.existsSync(snapshotPath)).toBe(true);
      expect(fs.existsSync(recordsPath)).toBe(true);
      // Files parse.
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      expect(snapshot.schemaVersion).toBe('agp.snapshot.v1');
      expect(snapshot.snapshotDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      const lines = fs.readFileSync(recordsPath, 'utf8').trim().split('\n');
      expect(lines.length).toBe(5);
      for (const line of lines) JSON.parse(line);
      // stdout has a JSON summary.
      const summary = JSON.parse(r.stdout);
      expect(summary.ok).toBe(true);
      expect(summary.snapshotDigest).toBe(snapshot.snapshotDigest);
    } finally {
      cleanup(out);
    }
  });

  test('JSON v1 input exits 2 with AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION', () => {
    const out = tempDir();
    try {
      const r = runCli([
        '--from',
        path.join(INVALID_FIX_DIR, 'json-v1.json'),
        '--output',
        out,
      ]);
      expect(r.exit).toBe(2);
      expect(r.stderr).toContain('AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION');
    } finally {
      cleanup(out);
    }
  });

  test('refuses a non-empty output dir without --force', () => {
    const out = tempDir();
    try {
      fs.writeFileSync(path.join(out, 'preexisting.txt'), 'hello');
      const r = runCli([
        '--from',
        path.join(FIX_DIR, 'minimal-monorepo.json'),
        '--output',
        out,
      ]);
      expect(r.exit).toBe(2);
      expect(r.stderr).toContain('AGP_EMITTER_OUTPUT_DIR_NOT_EMPTY');
    } finally {
      cleanup(out);
    }
  });

  test('--force overwrites a non-empty output dir', () => {
    const out = tempDir();
    try {
      fs.writeFileSync(path.join(out, 'preexisting.txt'), 'hello');
      const r = runCli([
        '--from',
        path.join(FIX_DIR, 'minimal-monorepo.json'),
        '--output',
        out,
        '--force',
        '--deterministic',
      ]);
      expect(r.exit).toBe(0);
      expect(fs.existsSync(path.join(out, 'snapshot.json'))).toBe(true);
    } finally {
      cleanup(out);
    }
  });

  test('stderr never contains a Node stack trace by default', () => {
    const out = tempDir();
    try {
      const r = runCli([
        '--from',
        path.join(INVALID_FIX_DIR, 'missing-topology.json'),
        '--output',
        out,
      ]);
      expect(r.exit).toBe(2);
      expect(r.stderr).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/);
    } finally {
      cleanup(out);
    }
  });
});
