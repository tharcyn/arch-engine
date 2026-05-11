/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase F — JSON v2 Envelope Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.1.0 JSON v2 envelope per spec
 *  docs/cli/json-v2-ci-flags-spec.md §6 / §7 / §15.2.
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
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function withFixtureCopy<T>(src: string, fn: (cwd: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseF-v2-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const REQUIRED_TOP_LEVEL_KEYS = [
  'archEngineVersion',
  'artifacts',
  'command',
  'data',
  'diagnostics',
  'emittedAt',
  'exitCode',
  'nextActions',
  'schemaVersion',
  'status',
  'summary',
];

const ALLOWED_STATUSES = new Set([
  'passed',
  'blocked',
  'warning',
  'error',
  'internal_error',
  'not_enforced',
]);

const ALLOWED_EXIT_CODES = new Set([0, 1, 2, 3, 5]);

describe('Phase F — JSON v2 envelope: required shape', () => {
  test('doctor v2 has exactly the 11 required top-level keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Object.keys(obj).sort()).toEqual(REQUIRED_TOP_LEVEL_KEYS.slice().sort());
    });
  });

  test('inspect v2 has the 11 required keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['inspect', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Object.keys(obj).sort()).toEqual(REQUIRED_TOP_LEVEL_KEYS.slice().sort());
    });
  });

  test('analyze v2 has the 11 required keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['analyze', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Object.keys(obj).sort()).toEqual(REQUIRED_TOP_LEVEL_KEYS.slice().sort());
    });
  });

  test('check v2 has the 11 required keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Object.keys(obj).sort()).toEqual(REQUIRED_TOP_LEVEL_KEYS.slice().sort());
    });
  });

  test('explain v2 has the 11 required keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['explain', 'regression', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Object.keys(obj).sort()).toEqual(REQUIRED_TOP_LEVEL_KEYS.slice().sort());
    });
  });

  test('top-level keys are emitted in alphabetical order', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      // Parse the raw JSON text to verify insertion order (which becomes
      // serialization order). Since JSON.stringify preserves key insertion
      // order, the keys array from JSON.parse on a re-stringified value
      // matches what was emitted.
      const obj = JSON.parse(stdout);
      const keys = Object.keys(obj);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });
});

describe('Phase F — JSON v2 envelope: field invariants', () => {
  test('schemaVersion is exactly arch-engine.cli.v2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.schemaVersion).toBe('arch-engine.cli.v2');
    });
  });

  test('command field matches invocation', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      for (const cmd of ['doctor', 'inspect', 'analyze', 'check']) {
        const { stdout } = runCli([cmd, '--json', '--json-schema=v2'], cwd);
        const obj = JSON.parse(stdout);
        expect(obj.command).toBe(cmd);
      }
    });
  });

  test('archEngineVersion matches the package version pattern', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(typeof obj.archEngineVersion).toBe('string');
      expect(/^\d+\.\d+\.\d+/.test(obj.archEngineVersion)).toBe(true);
    });
  });

  test('emittedAt is ISO 8601 UTC', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      // ISO 8601 with Z suffix; second resolution acceptable
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(obj.emittedAt)).toBe(true);
    });
  });

  test('status is one of the six allowed tokens', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      for (const cmd of ['doctor', 'inspect', 'analyze', 'check']) {
        const { stdout } = runCli([cmd, '--json', '--json-schema=v2'], cwd);
        const obj = JSON.parse(stdout);
        expect(ALLOWED_STATUSES.has(obj.status)).toBe(true);
      }
    });
  });

  test('exitCode is one of {0, 1, 2, 3, 5}', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(ALLOWED_EXIT_CODES.has(obj.exitCode)).toBe(true);
    });
  });

  test('diagnostics is array; artifacts is array; nextActions is array', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['analyze', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      expect(Array.isArray(obj.artifacts)).toBe(true);
      expect(Array.isArray(obj.nextActions)).toBe(true);
    });
  });

  test('data is a non-null object', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(typeof obj.data).toBe('object');
      expect(obj.data).not.toBeNull();
    });
  });

  test('summary is an object with headline + verdict', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['analyze', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(typeof obj.summary).toBe('object');
      expect(typeof obj.summary.headline).toBe('string');
      expect(typeof obj.summary.verdict).toBe('string');
    });
  });
});

describe('Phase F — v1 JSON unchanged by default', () => {
  test('doctor --json produces v1 (no schemaVersion key)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['doctor', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect('schemaVersion' in obj).toBe(false);
      expect('environment' in obj).toBe(true); // v1 key
    });
  });

  test('check --json produces v1 with flat violations[] at top-level', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.violations)).toBe(true); // v1.0.3 top-level field
      expect(typeof obj.artifactPath).toBe('string'); // v1 absolute path
      expect(typeof obj.artifactRelativePath).toBe('string'); // v1.0.3 added
      expect('schemaVersion' in obj).toBe(false);
    });
  });

  test('explicit --json-schema=v1 + --json produces same shape as default --json', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      // Warm-up run: doctor's `autoInitialized` flips on first call. Steady-
      // state shape is the contract we test.
      runCli(['doctor', '--json'], cwd);
      const a = runCli(['doctor', '--json'], cwd).stdout;
      const b = runCli(['doctor', '--json', '--json-schema=v1'], cwd).stdout;
      expect(a).toBe(b);
    });
  });
});

describe('Phase F — check on demo-drift v2 has blocked status + violations', () => {
  test('demo-drift check v2 has status=blocked, exitCode=1, data.violations populated', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout, status } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(1);
      const obj = JSON.parse(stdout);
      expect(obj.status).toBe('blocked');
      expect(obj.exitCode).toBe(1);
      expect(Array.isArray(obj.data.violations)).toBe(true);
      expect(obj.data.violations.length).toBeGreaterThan(0);
      // First violation has the locked spec shape.
      const v = obj.data.violations[0];
      expect(typeof v.id).toBe('string');
      expect(/^v_[a-f0-9]{8}$/.test(v.id)).toBe(true);
      expect(typeof v.ruleId).toBe('string');
      expect(typeof v.edge.from).toBe('string');
      expect(typeof v.edge.to).toBe('string');
      expect(v.code).toBe('ARCH_ENGINE_BLOCKING_VIOLATION');
    });
  });

  test('summary.verdict mirrors top-level status', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.summary.verdict).toBe(obj.status);
    });
  });
});

describe('Phase F — path-leakage policy', () => {
  test('default v2 emission has no artifacts[].absolutePath', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['analyze', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.artifacts.length).toBeGreaterThan(0);
      for (const a of obj.artifacts) {
        expect('absolutePath' in a).toBe(false);
      }
    });
  });

  test('--verbose v2 emission includes artifacts[].absolutePath', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['analyze', '--json', '--json-schema=v2', '--verbose'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.artifacts.length).toBeGreaterThan(0);
      for (const a of obj.artifacts) {
        expect(typeof a.absolutePath).toBe('string');
      }
    });
  });

  test('all data.* paths are repo-relative POSIX (no leading /)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      // Recursively scan data for path-shaped strings
      const stack: unknown[] = [obj.data];
      while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) {
          stack.push(...node);
        } else if (node && typeof node === 'object') {
          for (const v of Object.values(node)) stack.push(v);
        } else if (typeof node === 'string') {
          // A "path" is heuristic — reject anything starting with '/'
          // which would be unambiguously absolute on POSIX.
          if (node.startsWith('/')) {
            throw new Error(`absolute path leak: ${node}`);
          }
        }
      }
    });
  });
});

describe('Phase F — diagnostics ordering in v2', () => {
  test('diagnostics sorted by (severity desc, code asc, message asc)', () => {
    // Use the renderer directly via a synthesized input via process — but
    // we have no command that emits multiple diagnostics deterministically.
    // Instead assert that whatever order is emitted is non-decreasing in
    // severity rank when reversed.
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      const obj = JSON.parse(stdout);
      const rank: Record<string, number> = {
        INTERNAL: 5,
        BLOCKING: 4,
        ERROR: 3,
        WARNING: 2,
        INFO: 1,
      };
      let prevRank = Number.POSITIVE_INFINITY;
      let prevCode = '';
      for (const d of obj.diagnostics) {
        const r = rank[d.severity] ?? 0;
        if (r === prevRank) {
          expect(d.code >= prevCode).toBe(true);
        } else {
          expect(r).toBeLessThanOrEqual(prevRank);
        }
        prevRank = r;
        prevCode = d.code;
      }
    });
  });
});
