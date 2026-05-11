/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase F — Markdown / Output Writer Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.1.0 markdown output and `--output`
 *  writer per spec docs/cli/json-v2-ci-flags-spec.md §10 / §15.5.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseF-md-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('Phase F — markdown rendering', () => {
  test('check --format markdown on demo-drift produces blocked report', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout, status } = runCli(['check', '--format', 'markdown'], cwd);
      expect(status).toBe(1);
      expect(stdout).toMatch(/^# Arch-Engine `check`/m);
      expect(stdout).toMatch(/\*\*Verdict:\*\* Blocked/);
      expect(stdout).toMatch(/## Violations \(1\)/);
      expect(stdout).toMatch(/frontend-must-not-touch-payment-gateway/);
      expect(stdout).toMatch(/Exit 1 — blocking architecture violations\./);
    });
  });

  test('check --format markdown on no-policy fixture is not_enforced', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/\*\*Verdict:\*\* Not enforced/);
      expect(stdout).toMatch(/Exit 0/);
    });
  });

  test('analyze --format markdown produces a metric table', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['analyze', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/^# Arch-Engine `analyze`/m);
      expect(stdout).toMatch(/\| Metric \| Value \|/);
      expect(stdout).toMatch(/Coverage/);
    });
  });

  test('doctor --format markdown produces a readiness table', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['doctor', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/^# Arch-Engine `doctor`/m);
      expect(stdout).toMatch(/\| Check \| Value \|/);
      expect(stdout).toMatch(/Workspace/);
    });
  });

  test('inspect --format markdown produces a thin wrapper', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['inspect', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/^# Arch-Engine `inspect`/m);
    });
  });

  test('explain regression --format markdown produces a thin wrapper', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['explain', 'regression', '--format', 'markdown'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/^# Arch-Engine `explain`/m);
    });
  });

  test('markdown ends with trailing newline', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--format', 'markdown'], cwd);
      expect(stdout.endsWith('\n')).toBe(true);
    });
  });

  test('markdown contains no absolute paths', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--format', 'markdown'], cwd);
      expect(stdout).not.toMatch(/\s\/[A-Za-z][^\s]+\.json/);
    });
  });
});

describe('Phase F — --output writer', () => {
  test('--output writes markdown to a file in cwd', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const target = path.join(cwd, 'report.md');
      const { status } = runCli(['check', '--format', 'markdown', '--output', 'report.md'], cwd);
      expect(status).toBe(1);
      expect(fs.existsSync(target)).toBe(true);
      const content = fs.readFileSync(target, 'utf8');
      expect(content).toMatch(/^# Arch-Engine `check`/m);
    });
  });

  test('--output creates parent directories', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const targetRel = 'reports/v1.1/check.md';
      const targetAbs = path.join(cwd, targetRel);
      const { status } = runCli(['check', '--format', 'markdown', '--output', targetRel], cwd);
      expect(status).toBe(1);
      expect(fs.existsSync(targetAbs)).toBe(true);
    });
  });

  test('--output strips ANSI when writing human output', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const target = path.join(cwd, 'doctor.txt');
      // Force color via environment so the renderer would normally emit ANSI.
      const result = spawnSync('node', [CLI_BIN, 'doctor', '--output', 'doctor.txt'], {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '1' },
      });
      expect(result.status).toBe(0);
      const content = fs.readFileSync(target, 'utf8');
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[/.test(content)).toBe(false);
    });
  });

  test('--output produces LF line endings', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const target = path.join(cwd, 'report.md');
      runCli(['check', '--format', 'markdown', '--output', 'report.md'], cwd);
      const buf = fs.readFileSync(target);
      // No CRLF
      expect(buf.includes(Buffer.from('\r\n'))).toBe(false);
    });
  });

  test('--output writes JSON v1 by default', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const target = path.join(cwd, 'check.json');
      const { status } = runCli(['check', '--json', '--output', 'check.json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(fs.readFileSync(target, 'utf8'));
      expect('schemaVersion' in obj).toBe(false); // v1
      expect('artifactPath' in obj).toBe(true);
    });
  });

  test('--output writes JSON v2 when --json-schema=v2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const target = path.join(cwd, 'check.json');
      const { status } = runCli(['check', '--json', '--json-schema=v2', '--output', 'check.json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(fs.readFileSync(target, 'utf8'));
      expect(obj.schemaVersion).toBe('arch-engine.cli.v2');
    });
  });

  test('--output overwrites existing file', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const target = path.join(cwd, 'check.json');
      fs.writeFileSync(target, 'placeholder', 'utf8');
      const { status } = runCli(['check', '--json', '--output', 'check.json'], cwd);
      expect(status).toBe(0);
      const content = fs.readFileSync(target, 'utf8');
      expect(content.startsWith('{')).toBe(true);
      expect(content).not.toBe('placeholder');
    });
  });

  test('--output prints `Wrote` confirmation to stderr by default; quiet suppresses', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const a = runCli(['check', '--format', 'markdown', '--output', 'report.md'], cwd);
      expect(a.stderr).toMatch(/^Wrote /m);
      const b = runCli(['check', '--format', 'markdown', '--output', 'report.md', '--quiet'], cwd);
      expect(b.stderr).not.toMatch(/^Wrote /m);
    });
  });

  test('--output never prints confirmation in JSON mode', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const a = runCli(['check', '--json', '--output', 'check.json'], cwd);
      expect(a.stderr).not.toMatch(/^Wrote /m);
      // stdout is empty (or near-empty) when --output is set.
      expect(a.stdout.trim()).toBe('');
    });
  });
});

describe('Phase F — --output stdout suppression', () => {
  test('with --output, stdout is empty (output went to file)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--format', 'markdown', '--output', 'r.md'], cwd);
      expect(stdout).toBe('');
    });
  });
});
