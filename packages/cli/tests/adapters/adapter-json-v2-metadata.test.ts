/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 2 — JSON v2 data.adapter contract
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates the additive `data.adapter` JSON v2 block introduced
 *  in Pass 2:
 *    - Present on doctor / inspect / analyze / check JSON v2 output.
 *    - Carries name / version / packageManager / workspaceKind /
 *      confidence / reasons / warnings / alsoDetected / metadata.
 *    - JSON v1 default output unaffected (`adapter` key absent).
 *
 *  We invoke the CLI's built artifact `packages/cli/dist/bin.js`
 *  via `execFileSync` so the test reflects the actual shipping
 *  behaviour, not a developer-mode shortcut.
 */

import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const PNPM_FIXTURE = path.join(REPO_ROOT, 'packages/cli/tests/fixtures/adapters/pnpm-basic');

function runJson(args: string[], cwd: string): any {
  const out = execFileSync('node', [CLI_BIN, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

function runJsonAllowFail(args: string[], cwd: string): { exit: number; json: any } {
  try {
    const out = execFileSync('node', [CLI_BIN, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exit: 0, json: JSON.parse(out) };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer | string };
    const stdout = e.stdout?.toString('utf8') ?? '';
    return { exit: e.status ?? -1, json: stdout ? JSON.parse(stdout) : null };
  }
}

describe('JSON v2 data.adapter — repo root (yarn-npm workspace)', () => {
  test('doctor JSON v2 includes data.adapter with monorepo identity', () => {
    const json = runJson(['doctor', '--json', '--json-schema=v2'], REPO_ROOT);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
    expect(json.data.adapter.confidence).toBe('HIGH');
    expect(json.data.adapter.packageManager).toBe('npm');
    expect(Array.isArray(json.data.adapter.reasons)).toBe(true);
    expect(Array.isArray(json.data.adapter.alsoDetected)).toBe(true);
  });

  test('inspect JSON v2 includes data.adapter block', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], REPO_ROOT);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
  });

  test('analyze JSON v2 includes data.adapter block', () => {
    const json = runJson(['analyze', '--json', '--json-schema=v2'], REPO_ROOT);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
  });

  test('check JSON v2 includes data.adapter block', () => {
    const json = runJson(['check', '--json', '--json-schema=v2'], REPO_ROOT);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
  });
});

describe('JSON v1 default — data.adapter NOT present', () => {
  test('doctor --json (no v2) returns flat shape without `adapter` top-level key', () => {
    const json = runJson(['doctor', '--json'], REPO_ROOT);
    // The flat v1 shape has no `data` wrapper at all; it lives at the
    // top-level. Confirm the v2-shaped adapter block does NOT appear.
    expect(json.data).toBeUndefined();
    // Pass 1 / v1 default never included an adapter block.
    expect(json.adapter).toBeUndefined();
  });

  test('inspect --json (no v2) returns flat shape without `adapter` key', () => {
    const json = runJson(['inspect', '--json'], REPO_ROOT);
    expect(json.data).toBeUndefined();
    expect(json.adapter).toBeUndefined();
  });

  test('check --json (no v2) returns flat shape without `adapter` key', () => {
    const json = runJson(['check', '--json'], REPO_ROOT);
    expect(json.data).toBeUndefined();
    expect(json.adapter).toBeUndefined();
  });
});

describe('JSON v2 data.adapter — pnpm fixture (Pass 2 path)', () => {
  test('doctor on pnpm-basic selects pnpm adapter', () => {
    const json = runJson(['doctor', '--json', '--json-schema=v2'], PNPM_FIXTURE);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-pnpm');
    expect(json.data.adapter.confidence).toBe('HIGH');
    expect(json.data.adapter.packageManager).toBe('pnpm');
    expect(json.data.adapter.workspaceKind).toBe('pnpm-workspace');
  });

  test('inspect on pnpm-basic carries pnpm-specific metadata', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], PNPM_FIXTURE);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-pnpm');
    const md = json.data.adapter.metadata?.pnpm;
    expect(md).toBeDefined();
    expect(md.workspaceFile).toBe('pnpm-workspace.yaml');
  });

  test('check on pnpm-basic emits a no-policy verdict with pnpm adapter', () => {
    const { exit, json } = runJsonAllowFail(['check', '--json', '--json-schema=v2'], PNPM_FIXTURE);
    expect(exit).toBe(0);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-pnpm');
    expect(json.status).toBe('not_enforced');
  });

  // v1.3.1 micro-delta: `data.adapter.metadata.pnpm.packageManagerVersion`
  // must serialise consistently — a clean version string when the root
  // `package.json#packageManager` identifies pnpm, `null` otherwise.
  // Never `undefined`; never the raw `pnpm@x.y.z` form.
  test('packageManagerVersion is null on a fixture without packageManager field', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], PNPM_FIXTURE);
    const md = json.data.adapter.metadata.pnpm;
    expect('packageManagerVersion' in md).toBe(true);
    expect(md.packageManagerVersion).toBeNull();
  });
});

describe('JSON v2 data.adapter — pnpm fixture with packageManager hint', () => {
  // The `pnpm-workspace-protocol` fixture declares
  // `"packageManager": "pnpm@9.0.0"` in its root package.json.
  const PNPM_PROTOCOL_FIXTURE = path.join(
    REPO_ROOT,
    'packages/cli/tests/fixtures/adapters/pnpm-workspace-protocol',
  );

  test('packageManagerVersion is the bare version string ("9.0.0")', () => {
    const json = runJson(
      ['inspect', '--json', '--json-schema=v2'],
      PNPM_PROTOCOL_FIXTURE,
    );
    const md = json.data.adapter.metadata.pnpm;
    expect(md.packageManagerVersion).toBe('9.0.0');
  });

  test('packageManagerVersion remains stable across doctor / inspect / analyze / check', () => {
    const verbs: Array<'doctor' | 'inspect' | 'analyze' | 'check'> = [
      'doctor',
      'inspect',
      'analyze',
      'check',
    ];
    const versions = verbs.map((v) => {
      const { json } = runJsonAllowFail(
        [v, '--json', '--json-schema=v2'],
        PNPM_PROTOCOL_FIXTURE,
      );
      return json?.data?.adapter?.metadata?.pnpm?.packageManagerVersion;
    });
    expect(new Set(versions).size).toBe(1);
    expect(versions[0]).toBe('9.0.0');
  });

  test('emitted JSON contains no absolute paths under data.adapter.metadata.pnpm', () => {
    const json = runJson(
      ['inspect', '--json', '--json-schema=v2'],
      PNPM_PROTOCOL_FIXTURE,
    );
    const blob = JSON.stringify(json.data.adapter.metadata.pnpm);
    expect(blob).not.toMatch(/\/Users\//);
    expect(blob).not.toMatch(/^\/tmp\//);
    expect(blob).not.toMatch(/[A-Z]:\\/);
  });
});

describe('Adapter top-level identity is stable across commands', () => {
  test('every command emits the same data.adapter.name on the same fixture', () => {
    const fixture = PNPM_FIXTURE;
    const verbs: Array<'doctor' | 'inspect' | 'analyze' | 'check'> = ['doctor', 'inspect', 'analyze', 'check'];
    const names = verbs.map((v) => {
      const { json } = runJsonAllowFail([v, '--json', '--json-schema=v2'], fixture);
      return json?.data?.adapter?.name;
    });
    expect(new Set(names).size).toBe(1);
    expect(names[0]).toBe('@arch-engine/adapter-pnpm');
  });
});
