/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience MVP — Phase B: Help, Vocabulary, Demo Fixture
 * ═══════════════════════════════════════════════════════════
 *
 *  Stacks on top of the Phase A invariants. Pins the help-text
 *  enrichment, explain target vocabulary, and demo-drift fixture
 *  added in Phase B.
 *
 *  Coverage:
 *
 *  - Root help still lists exactly the v1.0.x five commands.
 *  - Root help includes the product promise.
 *  - Root help includes a recommended first-run path.
 *  - Per-command help includes Examples + a Docs URL.
 *  - check --help includes the exit-code reference.
 *  - explain --help documents the supported target vocabulary.
 *  - explain on an unknown target lists the special targets.
 *  - examples/demo-drift exists and runs the five v1.0.x commands.
 *
 *  Phase A invariants are still asserted in
 *  cli-experience-phase-a.test.ts and not duplicated here.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  PRODUCT_PROMISE,
  DOCS_URL,
  FIRST_RUN_PATH,
  SUPPORTED_EXPLAIN_TARGETS,
  isSpecialExplainTarget,
} from '../src/help-text.js';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');
const DEMO_DRIFT = path.join(REPO_ROOT, 'examples/demo-drift');

let smokeFixture = '';

beforeAll(() => {
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(`CLI bin missing: ${CLI_BIN}. Run \`npm run build\` first.`);
  }
  if (!fs.existsSync(SAMPLE_FIXTURE)) {
    throw new Error(`Fixture missing: ${SAMPLE_FIXTURE}`);
  }
  smokeFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseB-'));
  copyDirSync(SAMPLE_FIXTURE, smokeFixture);
});

afterAll(() => {
  if (smokeFixture && fs.existsSync(smokeFixture)) {
    fs.rmSync(smokeFixture, { recursive: true, force: true });
  }
  // The CLI auto-creates `.arch-engine/` inside any cwd it runs in.
  // Clean both fixtures so the repo working tree stays tidy.
  for (const dir of [SAMPLE_FIXTURE, DEMO_DRIFT]) {
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

function runCli(args: string[], opts: { cwd?: string } = {}): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd: opts.cwd ?? smokeFixture,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

// ─── Unit tests for help-text helpers ──────────────────

describe('help-text constants', () => {
  test('PRODUCT_PROMISE is non-empty and ends with a period', () => {
    expect(PRODUCT_PROMISE.length).toBeGreaterThan(0);
    expect(PRODUCT_PROMISE.endsWith('.')).toBe(true);
  });

  test('FIRST_RUN_PATH lists exactly the five v1.0.x commands in order', () => {
    expect(FIRST_RUN_PATH.map((e) => e.step)).toEqual([
      'arch-engine doctor',
      'arch-engine inspect',
      'arch-engine analyze',
      'arch-engine check',
    ]);
  });

  test('DOCS_URL is an absolute https URL', () => {
    expect(DOCS_URL).toMatch(/^https:\/\//);
  });

  test('SUPPORTED_EXPLAIN_TARGETS has at least regression and policy', () => {
    const keys = SUPPORTED_EXPLAIN_TARGETS.map((t) => t.keyword);
    expect(keys).toContain('regression');
    expect(keys).toContain('policy');
  });

  test('isSpecialExplainTarget identifies special vs free-form', () => {
    expect(isSpecialExplainTarget('regression')).toBe(true);
    expect(isSpecialExplainTarget('policy')).toBe(true);
    expect(isSpecialExplainTarget('frontend/checkout')).toBe(false);
    expect(isSpecialExplainTarget('')).toBe(false);
  });
});

// ─── Root help ─────────────────────────────────────────

describe('Phase B — root --help', () => {
  test('root help still lists exactly the five v1.0.x commands', () => {
    const { stdout } = runCli(['--help']);
    // Each of the five must appear in the Commands block.
    expect(stdout).toMatch(/^\s+doctor\s/m);
    expect(stdout).toMatch(/^\s+inspect\s/m);
    expect(stdout).toMatch(/^\s+analyze\s/m);
    expect(stdout).toMatch(/^\s+check\s/m);
    expect(stdout).toMatch(/^\s+explain <target>\s/m);
    // No accidental sixth command.
    expect(stdout).not.toMatch(/^\s+(github|gitlab|init|emit-agp|federation)/m);
  });

  test('root help includes the product promise', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain(PRODUCT_PROMISE);
  });

  test('root help includes a "First-run path" section', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toMatch(/First-run path:/);
    // All four ordered steps appear.
    for (const entry of FIRST_RUN_PATH) {
      expect(stdout).toContain(entry.step);
    }
  });

  test('root help includes a Docs: URL', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain(`Docs: ${DOCS_URL}`);
  });

  test('root help respects NO_COLOR (no ANSI escapes)', () => {
    const { stdout } = runCli(['--help']);
    // eslint-disable-next-line no-control-regex
    expect(stdout).not.toMatch(/\x1b\[/);
  });
});

// ─── Per-command help ──────────────────────────────────

describe('Phase B — per-command --help', () => {
  test('doctor --help includes Examples and Docs', () => {
    const { stdout } = runCli(['doctor', '--help']);
    expect(stdout).toMatch(/Examples:/);
    expect(stdout).toContain('arch-engine doctor');
    expect(stdout).toContain(`Docs: ${DOCS_URL}`);
  });

  test('inspect --help mentions read-only / no enforcement', () => {
    const { stdout } = runCli(['inspect', '--help']);
    expect(stdout).toMatch(/Examples:/);
    expect(stdout).toMatch(/never blocks CI|read-only|no enforcement/i);
  });

  test('analyze --help mentions informational / no-policy guidance', () => {
    const { stdout } = runCli(['analyze', '--help']);
    expect(stdout).toMatch(/informational/i);
  });

  test('check --help includes an Exit codes section with the documented codes (Phase D-Lite: 0/1/2/3/5)', () => {
    const { stdout } = runCli(['check', '--help']);
    expect(stdout).toMatch(/Exit codes:/);
    expect(stdout).toMatch(/^\s+0\s/m);
    // Phase D-Lite: blocking violations now exit 1; help must document
    // it explicitly.
    expect(stdout).toMatch(/^\s+1\s/m);
    expect(stdout).toMatch(/^\s+2\s/m);
    expect(stdout).toMatch(/^\s+3\s/m);
    expect(stdout).toMatch(/^\s+5\s/m);
    // The old advert that 5 means "blocking policy violations" must
    // be gone; 5 is now reserved for internal invariant failure.
    expect(stdout).not.toMatch(/blocking policy violations \(ENFORCE mode\)/i);
  });

  test('explain --help documents the supported target vocabulary', () => {
    const { stdout } = runCli(['explain', '--help']);
    expect(stdout).toMatch(/Supported targets:/);
    for (const t of SUPPORTED_EXPLAIN_TARGETS) {
      expect(stdout).toContain(t.keyword);
    }
    // Free-form substring search is also documented.
    expect(stdout).toMatch(/<name>|substring/i);
  });
});

// ─── Unknown explain target message ────────────────────

describe('Phase B — explain unknown target', () => {
  test('unknown target lists the supported special targets', () => {
    const { stdout, status } = runCli(['explain', 'qwertyuiop-not-a-real-target']);
    // Status is informational; explain never blocks.
    expect(status).toBe(0);
    expect(stdout).toMatch(/Supported special targets:/);
    expect(stdout).toContain('regression');
    expect(stdout).toContain('policy');
  });

  test('unknown target --json includes supportedSpecialTargets', () => {
    const { stdout, status } = runCli(['explain', 'qwertyuiop-not-a-real-target', '--json']);
    expect(status).toBe(0);
    const obj = JSON.parse(stdout);
    expect(Array.isArray(obj.supportedSpecialTargets)).toBe(true);
    expect(obj.supportedSpecialTargets).toContain('regression');
    expect(obj.supportedSpecialTargets).toContain('policy');
  });
});

// ─── Demo-drift fixture ────────────────────────────────

describe('Phase B — examples/demo-drift fixture', () => {
  test('fixture exists with the expected structure', () => {
    expect(fs.existsSync(DEMO_DRIFT)).toBe(true);
    expect(fs.existsSync(path.join(DEMO_DRIFT, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(DEMO_DRIFT, 'README.md'))).toBe(true);
    for (const ws of ['frontend', 'services', 'payments']) {
      expect(fs.existsSync(path.join(DEMO_DRIFT, 'src', ws, 'package.json'))).toBe(true);
    }
  });

  test('fixture ships an enforcement policy (Phase C)', () => {
    // Phase C lands a real policy that produces the canonical
    // "Blocked: 1 architecture violation." demo output. The exact
    // shape is asserted in cli-experience-phase-c.test.ts.
    expect(fs.existsSync(path.join(DEMO_DRIFT, '.archengine', 'policy.yml'))).toBe(true);
  });

  test('demo-drift README mentions the v1.0.x command set', () => {
    const readme = fs.readFileSync(path.join(DEMO_DRIFT, 'README.md'), 'utf8');
    for (const verb of ['doctor', 'inspect', 'analyze', 'check']) {
      expect(readme).toContain(`arch-engine ${verb}`);
    }
  });

  test('arch-engine doctor and inspect run cleanly against demo-drift', () => {
    // The fixture must work end-to-end on a fresh copy. We copy to a tempdir
    // so we don't mutate the repo's example directory with `.arch-engine/`.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseB-demo-'));
    try {
      copyDirSync(DEMO_DRIFT, tmp);
      {
        const { stdout, status } = runCli(['doctor'], { cwd: tmp });
        expect(status).toBe(0);
        expect(stdout).toMatch(/Packages detected:\s+4/);
      }
      {
        const { stdout, status } = runCli(['inspect'], { cwd: tmp });
        expect(status).toBe(0);
        expect(stdout).toMatch(/Nodes detected:\s+4/);
        // Three intra-workspace edges expected: frontend→services,
        // frontend→payments, services→payments.
        expect(stdout).toMatch(/Edges:\s+3/);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
