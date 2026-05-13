/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 2B — Release-surface completion tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Subprocess-driven tests pinning the three Pass 2B surfaces:
 *    1. `explain` JSON v2 carries `data.adapter` when an adapter ran
 *       (matched, unmatched, policy modes). Regression mode reads a
 *       saved artifact and does NOT include `data.adapter`.
 *    2. `doctor` human output shows a concise `Adapter: …` line.
 *    3. README and GitHub Actions docs mention pnpm support.
 *
 *  These tests complement the deeper structural tests in
 *  adapter-pnpm-selection.test.ts and adapter-json-v2-metadata.test.ts.
 */

import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
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

// ─── doctor human output (Pass 2B P4) ─────────────────────

describe('doctor human output — Adapter line', () => {
  test('shows Adapter: line with chosen adapter and confidence on repo root', () => {
    const text = runText(['doctor'], REPO_ROOT);
    expect(text).toMatch(/Adapter:\s+@arch-engine\/adapter-monorepo\s+\(HIGH confidence\)/);
  });

  test('shows pnpm adapter on a pnpm fixture', () => {
    const text = runText(['doctor'], PNPM_FIXTURE);
    expect(text).toMatch(/Adapter:\s+@arch-engine\/adapter-pnpm\s+\(HIGH confidence\)/);
  });

  test('Adapter line appears between Workspace type and Packages detected', () => {
    const text = runText(['doctor'], REPO_ROOT);
    const idxWorkspace = text.indexOf('Workspace type resolved as');
    const idxAdapter = text.indexOf('Adapter:');
    const idxPackages = text.indexOf('Packages detected');
    expect(idxWorkspace).toBeGreaterThan(-1);
    expect(idxAdapter).toBeGreaterThan(idxWorkspace);
    expect(idxPackages).toBeGreaterThan(idxAdapter);
  });

  test('doctor --quiet suppresses verbose output but Adapter line still appears', () => {
    // The Adapter line is part of the verdict header (not the optional
    // domain/integrity blocks suppressed by --quiet). Confirms users
    // running `arch-engine doctor --ci --quiet` still see which
    // adapter handled their repo.
    const text = runText(['doctor', '--quiet'], REPO_ROOT);
    expect(text).toMatch(/Adapter:\s+@arch-engine\/adapter-monorepo/);
  });
});

// ─── explain JSON v2 data.adapter (Pass 2B P3) ────────────

describe('explain JSON v2 — data.adapter', () => {
  test('matched target includes data.adapter sourced from runner-bridge', () => {
    const { exit, json } = runJsonAllowFail(
      ['explain', '@arch-engine/cli', '--json', '--json-schema=v2'],
      REPO_ROOT,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
    expect(json.data.adapter.confidence).toBe('HIGH');
  });

  test('unmatched target still emits data.adapter (extraction ran)', () => {
    const { exit, json } = runJsonAllowFail(
      ['explain', 'definitely-not-a-real-package-name', '--json', '--json-schema=v2'],
      REPO_ROOT,
    );
    expect(exit).toBe(0);
    expect(json.data.adapter).toBeDefined();
    expect(json.data.adapter.name).toBe('@arch-engine/adapter-monorepo');
  });

  test('regression mode does NOT include data.adapter (no adapter selection runs)', () => {
    // Ensure the stability-score.json artifact exists for the
    // regression read path; running `check` once warms it.
    runJsonAllowFail(['check', '--json', '--json-schema=v2'], REPO_ROOT);

    const { exit, json } = runJsonAllowFail(
      ['explain', 'regression', '--json', '--json-schema=v2'],
      REPO_ROOT,
    );
    expect(exit).toBe(0);
    // Regression mode reads the artifact; no adapter selection runs.
    expect(json.data.adapter).toBeUndefined();
    expect(json.data.mode).toBe('regression');
  });

  test('explain JSON v1 (no v2) does not include adapter key', () => {
    const { exit, json } = runJsonAllowFail(
      ['explain', '@arch-engine/cli', '--json'],
      REPO_ROOT,
    );
    expect(exit).toBe(0);
    // JSON v1 is flat — no data wrapper, no adapter key.
    expect(json.data).toBeUndefined();
    expect(json.adapter).toBeUndefined();
  });
});

// ─── Docs surface the pnpm adapter (Pass 2B P6) ───────────

describe('Docs mention pnpm support', () => {
  test('root README lists @arch-engine/adapter-pnpm', () => {
    const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
    expect(readme).toMatch(/@arch-engine\/adapter-pnpm/);
    expect(readme).toMatch(/pnpm workspace/i);
  });

  test('examples/github-actions/README mentions pnpm support', () => {
    const gha = fs.readFileSync(
      path.join(REPO_ROOT, 'examples/github-actions/README.md'),
      'utf8',
    );
    expect(gha).toMatch(/@arch-engine\/adapter-pnpm/);
    expect(gha).toMatch(/pnpm/i);
  });
});
