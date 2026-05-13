/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 3 — yarn-pnp JSON v2 data.adapter contract
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates the additive `data.adapter` JSON v2 block when the
 *  yarn-pnp adapter is selected:
 *    - Present on doctor / inspect / analyze / check JSON v2 output.
 *    - Carries name=@arch-engine/adapter-yarn-pnp,
 *      packageManager=yarn, workspaceKind=yarn-pnp.
 *    - `metadata.yarnPnp.packageManagerVersion` is deterministically
 *      serialised (parsed bare version or null).
 *    - `metadata.yarnPnp.pnpFilePresent` / `pnpLoaderPresent`
 *      reflect file presence.
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

const F = {
  basic: path.join(
    REPO_ROOT,
    'packages/cli/tests/fixtures/adapters/yarn-pnp-basic',
  ),
  protocol: path.join(
    REPO_ROOT,
    'packages/cli/tests/fixtures/adapters/yarn-pnp-workspace-protocol',
  ),
  objectForm: path.join(
    REPO_ROOT,
    'packages/cli/tests/fixtures/adapters/yarn-pnp-object-workspaces',
  ),
};

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

describe('JSON v2 data.adapter — yarn-pnp fixture (Pass 3)', () => {
  test('doctor selects yarn-pnp adapter and surfaces metadata', () => {
    const json = runJson(['doctor', '--json', '--json-schema=v2'], F.basic);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-yarn-pnp');
    expect(json.data.adapter.version).toBe('0.1.0');
    expect(json.data.adapter.confidence).toBe('HIGH');
    expect(json.data.adapter.packageManager).toBe('yarn');
    expect(json.data.adapter.workspaceKind).toBe('yarn-pnp');
    expect(Array.isArray(json.data.adapter.reasons)).toBe(true);
    expect(Array.isArray(json.data.adapter.alsoDetected)).toBe(true);
  });

  test('inspect carries yarn-pnp-specific metadata block', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], F.basic);
    const md = json.data.adapter.metadata?.yarnPnp;
    expect(md).toBeDefined();
    expect(md.pnpFilePresent).toBe(true);
    expect(md.pnpLoaderPresent).toBe(false);
    expect(md.yarnrcPresent).toBe(true);
    expect(md.nodeLinker).toBe('pnp');
    expect(md.workspacesPresent).toBe(true);
  });

  test('packageManagerVersion is the bare yarn version', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], F.basic);
    expect(json.data.adapter.metadata.yarnPnp.packageManagerVersion).toBe(
      '4.0.2',
    );
  });

  test('packageManagerVersion strips Corepack +sha on workspace-protocol fixture', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], F.protocol);
    expect(json.data.adapter.metadata.yarnPnp.packageManagerVersion).toBe(
      '4.1.0',
    );
  });

  test('object-form workspaces reports workspacesObjectForm: true', () => {
    const json = runJson(
      ['inspect', '--json', '--json-schema=v2'],
      F.objectForm,
    );
    expect(json.data.adapter.metadata.yarnPnp.workspacesObjectForm).toBe(true);
  });

  test('check on yarn-pnp fixture emits a no-policy verdict with yarn-pnp adapter', () => {
    const { exit, json } = runJsonAllowFail(
      ['check', '--json', '--json-schema=v2'],
      F.basic,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-yarn-pnp');
    expect(json.status).toBe('not_enforced');
  });

  test('diagnostics include ARCH_ENGINE_PNP_RESOLUTION_DEFERRED', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], F.basic);
    const codes = (json.diagnostics as Array<{ code: string }>).map(
      (d) => d.code,
    );
    expect(codes).toContain('ARCH_ENGINE_PNP_RESOLUTION_DEFERRED');
  });
});

describe('JSON v2 data.adapter — yarn-pnp identity stability', () => {
  test('every command emits the same data.adapter.name on the same yarn-pnp fixture', () => {
    const verbs: Array<'doctor' | 'inspect' | 'analyze' | 'check'> = [
      'doctor',
      'inspect',
      'analyze',
      'check',
    ];
    const names = verbs.map((v) => {
      const { json } = runJsonAllowFail(
        [v, '--json', '--json-schema=v2'],
        F.basic,
      );
      return json?.data?.adapter?.name;
    });
    expect(new Set(names).size).toBe(1);
    expect(names[0]).toBe('@arch-engine/adapter-yarn-pnp');
  });

  test('emitted JSON contains no absolute paths under data.adapter.metadata.yarnPnp', () => {
    const json = runJson(['inspect', '--json', '--json-schema=v2'], F.basic);
    const blob = JSON.stringify(json.data.adapter.metadata.yarnPnp);
    expect(blob).not.toMatch(/\/Users\//);
    expect(blob).not.toMatch(/^\/tmp\//);
    expect(blob).not.toMatch(/[A-Z]:\\/);
  });
});

describe('JSON v1 default — yarn-pnp does NOT add an adapter key', () => {
  test('doctor --json (no v2) on yarn-pnp fixture stays flat', () => {
    const json = runJson(['doctor', '--json'], F.basic);
    expect(json.data).toBeUndefined();
    expect(json.adapter).toBeUndefined();
  });

  test('inspect --json (no v2) on yarn-pnp fixture stays flat', () => {
    const json = runJson(['inspect', '--json'], F.basic);
    expect(json.data).toBeUndefined();
    expect(json.adapter).toBeUndefined();
  });
});

describe('Existing fixtures unchanged by Pass 3 wiring', () => {
  test('repo root still resolves to @arch-engine/adapter-monorepo (yarn-npm workspace)', () => {
    const json = runJson(['doctor', '--json', '--json-schema=v2'], REPO_ROOT);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
    expect(json.data.adapter.confidence).toBe('HIGH');
  });

  test('pnpm-basic fixture still resolves to @arch-engine/adapter-pnpm', () => {
    const PNPM_FIXTURE = path.join(
      REPO_ROOT,
      'packages/cli/tests/fixtures/adapters/pnpm-basic',
    );
    const json = runJson(['doctor', '--json', '--json-schema=v2'], PNPM_FIXTURE);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-pnpm');
    expect(json.data.adapter.confidence).toBe('HIGH');
  });
});
