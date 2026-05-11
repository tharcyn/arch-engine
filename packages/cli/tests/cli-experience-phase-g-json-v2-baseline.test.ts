/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase G — JSON v2 baseline integration tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Subprocess tests that exercise the full check/analyze flow
 *  with `--baseline` against the v1.2.0 contract.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-phaseG-jsonv2-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Generate a baseline file inside `cwd` by running `check --json --json-schema=v2`. */
function generateBaseline(cwd: string, outRelPath = 'arch-engine-baseline.json'): string {
  const { status } = runCli(
    ['check', '--ci', '--json', '--json-schema=v2', '--output', outRelPath],
    cwd,
  );
  expect([0, 1]).toContain(status);
  return path.join(cwd, outRelPath);
}

// ═══════════════════════════════════════════════════════════
//  Canonical topology is emitted unconditionally
// ═══════════════════════════════════════════════════════════

describe('Phase G — canonical topology in v2 outputs (no baseline)', () => {
  test('inspect --json --json-schema=v2 includes data.topology.canonical', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['inspect', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.data.topology.canonical).toBeDefined();
      expect(typeof obj.data.topology.canonical.graphSurfaceHash).toBe('string');
      expect(Array.isArray(obj.data.topology.canonical.nodes)).toBe(true);
      expect(Array.isArray(obj.data.topology.canonical.edges)).toBe(true);
    });
  });

  test('analyze --json --json-schema=v2 includes data.topology.canonical', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['analyze', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.data.topology.canonical).toBeDefined();
    });
  });

  test('check --json --json-schema=v2 includes data.topology.canonical', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--json', '--json-schema=v2'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.data.topology.canonical).toBeDefined();
      expect(obj.data.topology.canonical.nodes.length).toBeGreaterThan(0);
    });
  });

  test('canonical topology is NOT in JSON v1', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      // v1 has flat top-level keys, no `data` envelope.
      expect(obj.data).toBeUndefined();
      // and no `canonical` key anywhere obvious
      expect(obj.canonical).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  --baseline on check
// ═══════════════════════════════════════════════════════════

describe('Phase G — check --baseline (JSON v2 drift)', () => {
  test('same-source compare → exit 0, drift block present with zero counts', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['check', '--ci', '--baseline', baselinePath, '--json', '--json-schema=v2'],
        cwd,
      );
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.data.drift).toBeDefined();
      expect(obj.data.drift.summary.addedEdges).toBe(0);
      expect(obj.data.drift.summary.newViolations).toBe(0);
      expect(obj.data.drift.summary.graphSurfaceHashChanged).toBe(false);
    });
  });

  test('cross-fixture compare → drift detected; demo-drift exits 1 due to current violation', () => {
    // Generate baseline from sample-monorepo, then run check on
    // demo-drift with it. Demo-drift has its own different
    // topology AND a policy that introduces a violation.
    withFixtureCopy(SAMPLE_FIXTURE, (basecwd) => {
      const baselinePath = path.join(basecwd, 'baseline.json');
      runCli(['check', '--ci', '--json', '--json-schema=v2', '--output', 'baseline.json'], basecwd);

      withFixtureCopy(DEMO_DRIFT, (currcwd) => {
        const copied = path.join(currcwd, 'baseline.json');
        fs.copyFileSync(baselinePath, copied);
        const { stdout, status } = runCli(
          ['check', '--ci', '--baseline', './baseline.json', '--json', '--json-schema=v2'],
          currcwd,
        );
        expect(status).toBe(1); // current has blocking violation
        const obj = JSON.parse(stdout);
        expect(obj.data.drift).toBeDefined();
        expect(obj.data.drift.summary.newViolations).toBeGreaterThan(0);
        expect(obj.data.drift.summary.graphSurfaceHashChanged).toBe(true);
        // Status is `blocked` because current run has violations.
        expect(obj.status).toBe('blocked');
        expect(obj.exitCode).toBe(1);
      });
    });
  });

  test('summary.drift mirrors top-line counters', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout } = runCli(
        ['check', '--ci', '--baseline', baselinePath, '--json', '--json-schema=v2'],
        cwd,
      );
      const obj = JSON.parse(stdout);
      expect(obj.summary.drift).toBeDefined();
      expect(obj.summary.drift.newViolations).toBe(obj.data.drift.summary.newViolations);
      expect(obj.summary.drift.addedEdges).toBe(obj.data.drift.summary.addedEdges);
    });
  });

  test('baseline.path does not leak absolute path (default)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      // Use absolute path on CLI; expect baseline.path in output to be basename only.
      const { stdout } = runCli(
        ['check', '--ci', '--baseline', baselinePath, '--json', '--json-schema=v2'],
        cwd,
      );
      const obj = JSON.parse(stdout);
      // The user passed an absolute path, but the path in the JSON
      // should be basename-only by default (no leading /).
      expect(obj.data.drift.baseline.path.startsWith('/')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  --baseline on analyze
// ═══════════════════════════════════════════════════════════

describe('Phase G — analyze --baseline (JSON v2 drift)', () => {
  test('analyze --baseline produces drift block; exit 0 regardless', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['analyze', '--ci', '--baseline', baselinePath, '--json', '--json-schema=v2'],
        cwd,
      );
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj.data.drift).toBeDefined();
      expect(obj.command).toBe('analyze');
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  Invalid baselines
// ═══════════════════════════════════════════════════════════

describe('Phase G — invalid baselines exit 2', () => {
  test('non-existent path → exit 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(
        ['check', '--ci', '--baseline', './does-not-exist.json'],
        cwd,
      );
      expect(status).toBe(2);
    });
  });

  test('non-JSON file → exit 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const p = path.join(cwd, 'bad.json');
      fs.writeFileSync(p, 'not json {', 'utf8');
      const { status } = runCli(['check', '--ci', '--baseline', p], cwd);
      expect(status).toBe(2);
    });
  });

  test('wrong schemaVersion → exit 2', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const p = path.join(cwd, 'wrong-schema.json');
      fs.writeFileSync(
        p,
        JSON.stringify({ schemaVersion: 'arch-engine.cli.v1', command: 'check', archEngineVersion: '1.2.0', data: { topology: { canonical: { graphSurfaceVersion: '1.0.0', graphSurfaceHash: 'h', nodes: [], edges: [] } } } }),
      );
      const { status } = runCli(['check', '--ci', '--baseline', p], cwd);
      expect(status).toBe(2);
    });
  });

  test('--baseline on inspect → exit 2 (invalid config)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['inspect', '--baseline', './baseline.json'], cwd);
      expect(status).toBe(2);
    });
  });

  test('--baseline on doctor → exit 2 (invalid config)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['doctor', '--baseline', './baseline.json'], cwd);
      expect(status).toBe(2);
    });
  });

  test('--baseline on explain → exit 2 (invalid config)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { status } = runCli(['explain', 'regression', '--baseline', './baseline.json'], cwd);
      expect(status).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  Backward-compatibility (JSON v1 unchanged)
// ═══════════════════════════════════════════════════════════

describe('Phase G — JSON v1 unaffected by v1.2 additions', () => {
  test('check --json (v1 default) has no `data` envelope', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.data).toBeUndefined();
      expect(obj.schemaVersion).toBeUndefined();
      // v1.0.3 + v1.1.0 keys preserved
      expect(typeof obj.score).toBe('number');
      expect(Array.isArray(obj.violations)).toBe(true);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
    });
  });

  test('check --json (v1) with --baseline emits drift only via diagnostics, not by changing v1 shape', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const baselinePath = generateBaseline(cwd);
      const { stdout, status } = runCli(
        ['check', '--ci', '--baseline', baselinePath, '--json'],
        cwd,
      );
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      // No `data.drift` in v1; v1 has flat shape.
      expect(obj.data).toBeUndefined();
      // v1 violations / diagnostics arrays still present.
      expect(Array.isArray(obj.violations)).toBe(true);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
    });
  });
});
