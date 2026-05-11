/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase G — Drift output rendering tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Markdown + human drift rendering against the v1.2.0 contract.
 *  Verifies that `--baseline` adds the right sections to the
 *  user-facing output across check and analyze.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-phaseG-output-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function generateBaseline(cwd: string, outRelPath = 'arch-engine-baseline.json'): string {
  runCli(
    ['check', '--ci', '--json', '--json-schema=v2', '--output', outRelPath],
    cwd,
  );
  return path.join(cwd, outRelPath);
}

// Generate a cross-fixture baseline for drift scenarios.
function generateCrossBaseline(): { baselinePath: string; cleanup: () => void } {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-phaseG-basesrc-'));
  copyDirSync(SAMPLE_FIXTURE, baseDir);
  runCli(['check', '--ci', '--json', '--json-schema=v2', '--output', 'baseline.json'], baseDir);
  const baselinePath = path.join(baseDir, 'baseline.json');
  return {
    baselinePath,
    cleanup: () => fs.rmSync(baseDir, { recursive: true, force: true }),
  };
}

// ═══════════════════════════════════════════════════════════
//  Markdown — check
// ═══════════════════════════════════════════════════════════

describe('Phase G — markdown drift section (check)', () => {
  test('check --baseline --format markdown includes Architecture Drift section', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const { stdout, status } = runCli(
          ['check', '--ci', '--baseline', './baseline.json', '--format', 'markdown'],
          cwd,
        );
        expect(status).toBe(1);
        expect(stdout).toMatch(/^## Architecture Drift/m);
        // Drift summary table present.
        expect(stdout).toMatch(/\| Type \| Count \|/);
        // New violation surfaced in the New violating edges sub-section.
        expect(stdout).toMatch(/### New violating edges/);
        expect(stdout).toMatch(/frontend-must-not-touch-payment-gateway/);
      });
    } finally {
      cleanup();
    }
  });

  test('check --baseline (no drift) produces a "No drift detected" line', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['check', '--ci', '--baseline', baselinePath, '--format', 'markdown'],
        cwd,
      );
      expect(status).toBe(0);
      expect(stdout).toMatch(/^## Architecture Drift/m);
      expect(stdout).toMatch(/No architectural drift detected/);
    });
  });

  test('verdict line carries drift parenthetical when drift is non-zero', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const { stdout } = runCli(
          ['check', '--ci', '--baseline', './baseline.json', '--format', 'markdown'],
          cwd,
        );
        expect(stdout).toMatch(/\*\*Verdict:\*\* Blocked _\(drift:/);
      });
    } finally {
      cleanup();
    }
  });

  test('markdown drift section contains no absolute paths', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const { stdout } = runCli(
          ['check', '--ci', '--baseline', './baseline.json', '--format', 'markdown'],
          cwd,
        );
        // No paths starting with `/` followed by an alphanum.
        expect(stdout).not.toMatch(/\s\/[A-Za-z][^\s]+\.json/);
      });
    } finally {
      cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  Markdown — analyze
// ═══════════════════════════════════════════════════════════

describe('Phase G — markdown drift section (analyze)', () => {
  test('analyze --baseline --format markdown includes Architecture Drift', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['analyze', '--ci', '--baseline', baselinePath, '--format', 'markdown'],
        cwd,
      );
      expect(status).toBe(0);
      expect(stdout).toMatch(/^## Architecture Drift/m);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  Human output — check
// ═══════════════════════════════════════════════════════════

describe('Phase G — human drift block (check)', () => {
  test('check --baseline (with drift) prints "Architecture drift detected"', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const { stdout, status } = runCli(
          ['check', '--ci', '--baseline', './baseline.json'],
          cwd,
        );
        expect(status).toBe(1);
        expect(stdout).toMatch(/Architecture drift detected/);
        expect(stdout).toMatch(/Added edges/);
        expect(stdout).toMatch(/New blocking violations/);
      });
    } finally {
      cleanup();
    }
  });

  test('check --baseline (no drift) prints "No architectural drift detected"', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['check', '--ci', '--baseline', baselinePath],
        cwd,
      );
      expect(status).toBe(0);
      expect(stdout).toMatch(/No architectural drift detected/);
    });
  });

  test('--quiet suppresses drift detail tables but keeps the summary line', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const a = runCli(['check', '--ci', '--baseline', './baseline.json'], cwd);
        const b = runCli(['check', '--ci', '--quiet', '--baseline', './baseline.json'], cwd);
        // Both still mention drift, but quiet is shorter.
        expect(b.stdout).toMatch(/Architecture drift detected/);
        expect(b.stdout.length).toBeLessThan(a.stdout.length);
        // Quiet mode does not include the per-edge detail table.
        expect(b.stdout).not.toMatch(/Added edges \(\d+\):/);
      });
    } finally {
      cleanup();
    }
  });

  test('--verbose includes the absolute baseline path', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout } = runCli(
        ['check', '--ci', '--verbose', '--baseline', baselinePath],
        cwd,
      );
      // The absolute path of the baseline (cwd + filename) should appear in stdout.
      expect(stdout).toContain(baselinePath);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  --output writes markdown drift report
// ═══════════════════════════════════════════════════════════

describe('Phase G — --output writes drift markdown', () => {
  test('check --baseline --format markdown --output writes a file with the drift section', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const target = path.join(cwd, 'report.md');
        const { status } = runCli(
          [
            'check',
            '--ci',
            '--baseline',
            './baseline.json',
            '--format',
            'markdown',
            '--output',
            'report.md',
          ],
          cwd,
        );
        expect(status).toBe(1);
        const content = fs.readFileSync(target, 'utf8');
        expect(content).toMatch(/^## Architecture Drift/m);
        expect(content).toMatch(/\*\*Verdict:\*\* Blocked/);
      });
    } finally {
      cleanup();
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  Determinism
// ═══════════════════════════════════════════════════════════

describe('Phase G — drift output determinism', () => {
  test('two consecutive runs produce identical markdown drift section', () => {
    const { baselinePath, cleanup } = generateCrossBaseline();
    try {
      withFixtureCopy(DEMO_DRIFT, (cwd) => {
        fs.copyFileSync(baselinePath, path.join(cwd, 'baseline.json'));
        const a = runCli(['check', '--ci', '--baseline', './baseline.json', '--format', 'markdown'], cwd).stdout;
        const b = runCli(['check', '--ci', '--baseline', './baseline.json', '--format', 'markdown'], cwd).stdout;
        // Strip wall-clock metric values (the existing v1.1 timing line is
        // gone from markdown; but be defensive in case future code adds them).
        const norm = (s: string) => s.replace(/Extraction:\s*\d+ms\s*\|\s*Pipeline:\s*\d+ms\s*\|\s*Total:\s*\d+ms/g, '<X>');
        expect(norm(a)).toBe(norm(b));
      });
    } finally {
      cleanup();
    }
  });
});
