/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience MVP — Phase D-Lite: Exit-Code Repair
 * ═══════════════════════════════════════════════════════════
 *
 *  Stacks on Phase A + B + C. Pins the exit-code semantics
 *  for `arch-engine check`:
 *
 *      0  No blocking architecture violations
 *      1  Blocking architecture violations found  (Phase D-Lite)
 *      2  Invalid input or configuration          (reserved)
 *      3  Adapter/workspace failure
 *      5  Internal invariant failure              (reserved)
 *
 *  Before Phase D-Lite, blocking violations exited 5 (enforce-mode
 *  policy) or 2 (BLOCKER authority-tier crossings). Both now exit 1.
 *  Codes 2 and 5 are reserved for non-violation classes.
 *
 *  These tests are intentionally narrow and process-level so any
 *  regression that drifts the exit-code mapping back is loud.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const DEMO_DRIFT = path.join(REPO_ROOT, 'examples/demo-drift');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');

beforeAll(() => {
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(`CLI bin missing: ${CLI_BIN}. Run \`npm run build\` first.`);
  }
});

afterAll(() => {
  for (const dir of [DEMO_DRIFT, SAMPLE_FIXTURE]) {
    const archDir = path.join(dir, '.arch-engine');
    if (fs.existsSync(archDir)) {
      fs.rmSync(archDir, { recursive: true, force: true });
    }
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

function runCli(args: string[], cwd: string): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function withFixtureCopy<T>(src: string, fn: (cwd: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseD-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Exit-code mapping per spec §9.1 ────────────────────

describe('Phase D-Lite — check exit-code mapping', () => {
  test('exit 0: clean policy (no blocking violations)', () => {
    // examples/sample-monorepo has no policy file; check exits 0
    // informationally per Phase A.
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check'], cwd);
      expect(status).toBe(0);
    });
  });

  test('exit 1: blocking architecture violation (was 5 in v1.0.1)', () => {
    // examples/demo-drift ships a policy that produces a real
    // blocking violation. The pre-Phase-D-Lite behavior was 5.
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { status, stdout } = runCli(['check'], cwd);
      expect(status).toBe(1);
      // Output must self-describe its exit code consistently.
      expect(stdout).toMatch(/^Exit 1: blocking architecture violations\.$/m);
      // Must NOT regress to the old "Exit 5: blocking policy violations." line.
      expect(stdout).not.toMatch(/Exit 5/);
      expect(stdout).not.toMatch(/blocking policy violations\./);
    });
  });

  test('exit 1: same code applies in JSON mode (process exit only)', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { status, stdout } = runCli(['check', '--json'], cwd);
      expect(status).toBe(1);
      // JSON shape unchanged (no new keys, no removed keys).
      const obj = JSON.parse(stdout);
      expect(obj).toHaveProperty('score');
      expect(obj).toHaveProperty('stabilityTier');
      expect(obj).toHaveProperty('artifactPath');
      expect(obj).toHaveProperty('policyConfigured', true);
    });
  });

  test('exit code 5 is reserved (no violation path emits it any more)', () => {
    // Currently no v1.0.x fixture triggers exit 5 (internal invariant
    // failure). This test pins the absence: blocking violation paths
    // no longer use 5.
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { status } = runCli(['check'], cwd);
      expect(status).not.toBe(5);
    });
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check'], cwd);
      expect(status).not.toBe(5);
    });
  });
});

// ─── Help advertises the new mapping ─────────────────────

describe('Phase D-Lite — check --help advertises the new exit codes', () => {
  test('help text lists code 1 as the blocking-violation code', () => {
    // Help is a global CLI surface; running from any cwd is fine.
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/Exit codes:/);
    // Must include code 1 with the "blocking architecture violations"
    // semantic.
    expect(stdout).toMatch(/^\s+1\s+Blocking architecture violations found/m);
    // Code 5 is reserved for internal invariant failure, NOT blocking
    // policy violations any more.
    expect(stdout).toMatch(/^\s+5\s+Internal invariant failure/m);
    expect(stdout).not.toMatch(/blocking policy violations \(ENFORCE mode\)/i);
  });

  test('help text reserves code 2 for invalid input/config', () => {
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/^\s+2\s+Invalid input or configuration/m);
  });

  test('help text reserves code 3 for adapter/workspace failure', () => {
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/^\s+3\s+Adapter\/workspace failure/m);
  });
});

// ─── Cross-command exit codes still informational ───────

describe('Phase D-Lite — non-check commands still informational', () => {
  test('doctor / inspect / analyze / explain on demo-drift still exit 0', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      expect(runCli(['doctor'], cwd).status).toBe(0);
      expect(runCli(['inspect'], cwd).status).toBe(0);
      expect(runCli(['analyze'], cwd).status).toBe(0);
      expect(runCli(['explain', 'regression'], cwd).status).toBe(0);
    });
  });
});
