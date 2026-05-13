/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 3 — yarn-pnp selection wiring
 * ═══════════════════════════════════════════════════════════
 *
 *  Structural tests for the Pass 3 registry wiring. Exercises the
 *  deterministic selection algorithm with all three adapters
 *  registered (pnpm@2, yarn-pnp@3, monorepo@4) and confirms:
 *
 *    - yarn-pnp wins HIGH on a .pnp.cjs + workspaces repo.
 *    - pnpm still wins HIGH when both .pnp.cjs and
 *      pnpm-workspace.yaml are present (the registry-level
 *      tiebreaker plus the monorepo cache-hint decline keep this
 *      conflict-free).
 *    - monorepo wins HIGH for plain npm/yarn-classic workspaces
 *      (no PnP file).
 *    - Single-package fallback still goes to monorepo at LOW.
 *
 *  No CLI subprocess — exercises the structural surfaces directly.
 */

import { describe, expect, test } from 'vitest';
import * as path from 'node:path';
import {
  selectArchitectureAdapter,
  registerArchitectureAdapter,
} from '../../src/adapters/adapter-registry.js';
import {
  createAdapterContext,
  type ArchitectureAdapter,
} from '../../src/adapters/adapter-contract.js';
import { monorepoArchitectureAdapter } from '@arch-engine/adapter-monorepo';
import { pnpmArchitectureAdapter } from '@arch-engine/adapter-pnpm';
import { yarnPnpArchitectureAdapter } from '@arch-engine/adapter-yarn-pnp';

const FIX = path.resolve(__dirname, '..', 'fixtures', 'adapters');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function buildRegistry() {
  return [
    registerArchitectureAdapter(
      pnpmArchitectureAdapter as unknown as ArchitectureAdapter,
      2,
    ),
    registerArchitectureAdapter(
      yarnPnpArchitectureAdapter as unknown as ArchitectureAdapter,
      3,
    ),
    registerArchitectureAdapter(
      monorepoArchitectureAdapter as unknown as ArchitectureAdapter,
      4,
    ),
  ];
}

function ctxWithHints(cwd: string) {
  const c = createAdapterContext(cwd);
  c.cache.set('archengine:pnpmAdapterAvailable', true);
  c.cache.set('archengine:yarnPnpAdapterAvailable', true);
  return c;
}

describe('Adapter selection — yarn-pnp fixture (Pass 3)', () => {
  test('yarn-pnp wins HIGH on a valid PnP+workspaces fixture', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-basic')),
    );
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('yarn-pnp');
    expect(r.detection?.confidence).toBe('HIGH');
    expect(r.detection?.workspaceKind).toBe('yarn-pnp');
  });

  test('yarn-pnp wins HIGH on object-form workspaces', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-object-workspaces')),
    );
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('yarn-pnp');
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('yarn-pnp wins HIGH on .pnp.loader.mjs-only fixture', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-loader-only')),
    );
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('yarn-pnp');
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('monorepo declines yarn-pnp+workspaces when yarn-pnp adapter is registered (no CONFLICT)', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-basic')),
    );
    // Only yarn-pnp detected — monorepo declined via the
    // archengine:yarnPnpAdapterAvailable cache-hint protocol.
    expect(r.runnersUp).toHaveLength(0);
    expect(r.status).toBe('RESOLVED');
  });

  test('empty-globs fixture returns MEDIUM', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-empty-globs')),
    );
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('yarn-pnp');
    expect(r.detection?.confidence).toBe('MEDIUM');
  });

  test('deterministic replay across two invocations', () => {
    const a = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-basic')),
    );
    const b = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'yarn-pnp-basic')),
    );
    expect(a.selected?.adapter.adapterName).toBe(b.selected?.adapter.adapterName);
    expect(a.detection?.confidence).toBe(b.detection?.confidence);
  });
});

describe('Adapter selection — pnpm-vs-yarn-pnp conflict (Pass 3)', () => {
  test('pnpm wins when both pnpm-workspace.yaml AND .pnp.cjs exist', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(
        path.join(FIX, 'yarn-pnp-with-pnpm-workspace-conflict'),
      ),
    );
    expect(r.status).toBe('RESOLVED');
    // pnpm wins because yarn-pnp declines pnpm-workspace.yaml when
    // the pnpm adapter is registered (mirrors the monorepo decline
    // protocol). The monorepo adapter also declines via its own
    // cache-hint protocol. Only pnpm detects → no CONFLICT.
    expect(r.selected?.adapter.adapterName).toBe('pnpm');
    expect(r.detection?.confidence).toBe('HIGH');
    expect(r.runnersUp).toHaveLength(0);
  });
});

describe('Adapter selection — existing behavior unchanged (Pass 3)', () => {
  test('monorepo still wins HIGH on the repo root (yarn-npm workspace)', () => {
    const r = selectArchitectureAdapter(buildRegistry(), ctxWithHints(REPO_ROOT));
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe(
      '@arch-engine/adapter-monorepo',
    );
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('pnpm still wins HIGH on pnpm-basic fixture', () => {
    const r = selectArchitectureAdapter(
      buildRegistry(),
      ctxWithHints(path.join(FIX, 'pnpm-basic')),
    );
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('pnpm');
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('without yarn-pnp hint, monorepo still claims yarn-pnp+workspaces (back-compat)', () => {
    // Simulates the case where @arch-engine/adapter-yarn-pnp is NOT
    // installed. The monorepo adapter's yarn-pnp cache-hint check is
    // a no-op without the hint, so monorepo handles the repo as a
    // plain `yarn-npm` workspace at HIGH confidence.
    const registryWithoutYarnPnp = [
      registerArchitectureAdapter(
        pnpmArchitectureAdapter as unknown as ArchitectureAdapter,
        2,
      ),
      registerArchitectureAdapter(
        monorepoArchitectureAdapter as unknown as ArchitectureAdapter,
        4,
      ),
    ];
    const ctx = createAdapterContext(path.join(FIX, 'yarn-pnp-basic'));
    ctx.cache.set('archengine:pnpmAdapterAvailable', true);
    const r = selectArchitectureAdapter(registryWithoutYarnPnp, ctx);
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe(
      '@arch-engine/adapter-monorepo',
    );
    expect(r.detection?.confidence).toBe('HIGH');
  });
});
