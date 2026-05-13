/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 3 — yarn-pnp CLI smoke
 * ═══════════════════════════════════════════════════════════
 *
 *  Subprocess-driven smoke tests pinning the user-visible Pass 3
 *  surfaces:
 *    1. `doctor` human output shows `Adapter selected:
 *       @arch-engine/adapter-yarn-pnp (HIGH adapter confidence)` on a
 *       yarn-pnp fixture.
 *    2. `inspect`/`analyze`/`check` succeed on a yarn-pnp fixture.
 *    3. `explain <pkg>` JSON v2 surfaces the yarn-pnp adapter.
 *    4. Pre-existing pnpm/monorepo doctor output unchanged.
 */

import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');

const YARN_PNP_FIXTURE = path.join(
  REPO_ROOT,
  'packages/cli/tests/fixtures/adapters/yarn-pnp-basic',
);
const PNPM_FIXTURE = path.join(
  REPO_ROOT,
  'packages/cli/tests/fixtures/adapters/pnpm-basic',
);

function runText(args: string[], cwd: string): string {
  return execFileSync('node', [CLI_BIN, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

describe('doctor human output — yarn-pnp Adapter selected line', () => {
  test('yarn-pnp-basic fixture shows yarn-pnp adapter HIGH', () => {
    const text = runText(['doctor'], YARN_PNP_FIXTURE);
    expect(text).toMatch(
      /Adapter selected:\s+@arch-engine\/adapter-yarn-pnp\s+\(HIGH adapter confidence\)/,
    );
    expect(text).toMatch(/Topology signal:/);
  });

  test('yarn-pnp doctor reports workspace type yarn-pnp', () => {
    const text = runText(['doctor'], YARN_PNP_FIXTURE);
    expect(text).toMatch(/Workspace type resolved as:\s+yarn-pnp/);
  });
});

describe('inspect / analyze / check on yarn-pnp fixture', () => {
  test('inspect exits 0 and produces JSON v2 envelope', () => {
    const { exit, json } = runJsonAllowFail(
      ['inspect', '--json', '--json-schema=v2'],
      YARN_PNP_FIXTURE,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-yarn-pnp');
  });

  test('analyze exits 0 and includes data.adapter', () => {
    const { exit, json } = runJsonAllowFail(
      ['analyze', '--json', '--json-schema=v2'],
      YARN_PNP_FIXTURE,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-yarn-pnp');
  });

  test('check exits 0 with not_enforced status', () => {
    const { exit, json } = runJsonAllowFail(
      ['check', '--json', '--json-schema=v2'],
      YARN_PNP_FIXTURE,
    );
    expect(exit).toBe(0);
    expect(json.status).toBe('not_enforced');
  });
});

describe('explain on yarn-pnp fixture', () => {
  test('matched target carries data.adapter from yarn-pnp adapter', () => {
    const { exit, json } = runJsonAllowFail(
      [
        'explain',
        '@yarn-pnp-basic/shared',
        '--json',
        '--json-schema=v2',
      ],
      YARN_PNP_FIXTURE,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-yarn-pnp');
  });

  test('regression mode still omits data.adapter', () => {
    // Prime the artifact via check.
    runJsonAllowFail(['check', '--json', '--json-schema=v2'], YARN_PNP_FIXTURE);
    const { exit, json } = runJsonAllowFail(
      ['explain', 'regression', '--json', '--json-schema=v2'],
      YARN_PNP_FIXTURE,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter).toBeUndefined();
    expect(json.data.mode).toBe('regression');
  });
});

describe('Pre-existing fixtures unchanged by Pass 3', () => {
  test('pnpm-basic doctor output still says @arch-engine/adapter-pnpm', () => {
    const text = runText(['doctor'], PNPM_FIXTURE);
    expect(text).toMatch(
      /Adapter selected:\s+@arch-engine\/adapter-pnpm\s+\(HIGH adapter confidence\)/,
    );
  });

  test('repo root doctor still says @arch-engine/adapter-monorepo', () => {
    const text = runText(['doctor'], REPO_ROOT);
    expect(text).toMatch(
      /Adapter selected:\s+@arch-engine\/adapter-monorepo\s+\(HIGH adapter confidence\)/,
    );
  });
});
