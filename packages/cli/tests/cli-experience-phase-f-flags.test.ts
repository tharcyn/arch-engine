/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase F — Flag Matrix Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.1.0 JSON v2 / CI flags surface.
 *  Covers spec docs/cli/json-v2-ci-flags-spec.md §15.1.
 */

import { describe, expect, test, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');

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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseF-flags-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════
//  Help discoverability
// ═══════════════════════════════════════════════════════════

describe('Phase F — root --help advertises new flags', () => {
  test('root help mentions --json-schema, --ci, --format, --output, --verbose, --quiet', () => {
    const { stdout } = runCli(['--help'], REPO_ROOT);
    expect(stdout).toMatch(/--json-schema/);
    expect(stdout).toMatch(/--ci/);
    expect(stdout).toMatch(/--format/);
    expect(stdout).toMatch(/--output/);
    expect(stdout).toMatch(/--verbose/);
    expect(stdout).toMatch(/--quiet/);
  });

  test('check --help shows v1.1 example with --ci', () => {
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/arch-engine check --ci/);
  });

  test('check --help shows v1.1 example with --json-schema=v2', () => {
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/--json-schema=v2/);
  });

  test('check --help shows --format markdown --output example', () => {
    const { stdout } = runCli(['check', '--help'], REPO_ROOT);
    expect(stdout).toMatch(/--format markdown --output/);
  });
});

// ═══════════════════════════════════════════════════════════
//  Invalid values → exit 2
// ═══════════════════════════════════════════════════════════

describe('Phase F — invalid flag values exit 2', () => {
  test('invalid --json-schema exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status, stdout, stderr } = runCli(['check', '--json', '--json-schema=v9'], cwd);
      expect(status).toBe(2);
      // Diagnostic message lands in stderr for human mode, stdout for
      // JSON mode (we passed `--json` here, so JSON mode wins).
      expect(stdout + stderr).toMatch(/Invalid (CLI options|--json-schema)/i);
    });
  });

  test('invalid --format exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check', '--format', 'xml'], cwd);
      expect(status).toBe(2);
    });
  });

  test('--output trailing slash exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check', '--format', 'markdown', '--output', 'reports/'], cwd);
      expect(status).toBe(2);
    });
  });

  // `--output ''` is intentionally not asserted: cac collapses an empty
  // string argument so the validator never sees one. The trailing-slash
  // case above covers the path-shape validation surface.
});

// ═══════════════════════════════════════════════════════════
//  Forbidden combinations → exit 2
// ═══════════════════════════════════════════════════════════

describe('Phase F — forbidden flag combinations exit 2', () => {
  test('--json-schema=v2 without --json or --format json exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status, stderr } = runCli(['check', '--json-schema=v2'], cwd);
      expect(status).toBe(2);
      expect(stderr + '').toMatch(/--json-schema=v2 requires --json/i);
    });
  });

  test('--json + --format markdown exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status, stderr } = runCli(['check', '--json', '--format', 'markdown'], cwd);
      expect(status).toBe(2);
      expect(stderr + '').toMatch(/Conflicting options/i);
    });
  });

  test('--json + --format human exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check', '--json', '--format', 'human'], cwd);
      expect(status).toBe(2);
    });
  });

  test('--json-schema=v2 + --format markdown exits 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['check', '--format', 'markdown', '--json-schema=v2'], cwd);
      expect(status).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  Allowed combinations
// ═══════════════════════════════════════════════════════════

describe('Phase F — allowed flag combinations', () => {
  test('--format json aliases --json (produces same v1 shape by default)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const a = runCli(['doctor', '--json'], cwd).stdout;
      const b = runCli(['doctor', '--format', 'json'], cwd).stdout;
      // Both produce v1 JSON; same shape
      const oa = JSON.parse(a);
      const ob = JSON.parse(b);
      expect(Object.keys(oa).sort()).toEqual(Object.keys(ob).sort());
    });
  });

  test('--quiet + --verbose is allowed; --quiet wins for human stdout', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status, stdout } = runCli(['doctor', '--quiet', '--verbose'], cwd);
      expect(status).toBe(0);
      // Quiet should suppress most lines; verbose can't override.
      // We assert the output is significantly shorter than non-quiet.
      const normal = runCli(['doctor'], cwd).stdout;
      expect(stdout.length).toBeLessThan(normal.length);
    });
  });

  test('--ci does not imply --json (default human under --ci)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['doctor', '--ci'], cwd);
      expect(status).toBe(0);
      // The human-form starts with the workspace line; never JSON `{`.
      const trimmed = stdout.trimStart();
      expect(trimmed.startsWith('{')).toBe(false);
    });
  });

  test('--ci forces no-color (no ANSI escapes anywhere)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, stderr } = runCli(['doctor', '--ci'], cwd);
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[/.test(stdout + stderr)).toBe(false);
    });
  });

  test('--ci + --json + --json-schema=v2 produces v2 envelope', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--ci', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.schemaVersion).toBe('arch-engine.cli.v2');
    });
  });

  test('--ci + --format markdown produces markdown', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--ci', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/^# Arch-Engine `check`/m);
    });
  });
});
