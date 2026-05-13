/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 2 — pnpm selection + monorepo decline
 * ═══════════════════════════════════════════════════════════
 *
 *  Tests the deterministic adapter-selection wiring landed in
 *  packages/cli/src/runner-bridge.ts:
 *
 *    - When pnpm-workspace.yaml is present AND @arch-engine/adapter-pnpm
 *      is registered, the monorepo adapter declines pnpm-workspace.yaml
 *      so pnpm wins HIGH-confidence selection without surfacing
 *      ARCH_ENGINE_ADAPTER_CONFLICT.
 *    - For package.json#workspaces fixtures, monorepo wins HIGH.
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

const FIX = path.resolve(__dirname, '..', 'fixtures', 'adapters');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function buildRegistry() {
  return [
    registerArchitectureAdapter(pnpmArchitectureAdapter as unknown as ArchitectureAdapter, 2),
    registerArchitectureAdapter(monorepoArchitectureAdapter as unknown as ArchitectureAdapter, 4),
  ];
}

function ctxWithPnpmHint(cwd: string) {
  const c = createAdapterContext(cwd);
  c.cache.set('archengine:pnpmAdapterAvailable', true);
  return c;
}

describe('Adapter selection — pnpm fixture (Pass 2)', () => {
  test('pnpm wins HIGH on a valid pnpm fixture', () => {
    const r = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(path.join(FIX, 'pnpm-basic')));
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('pnpm');
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('monorepo declines pnpm-workspace.yaml when pnpm adapter is registered', () => {
    // With pnpm hint set, monorepo should NOT detect the pnpm fixture.
    const r = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(path.join(FIX, 'pnpm-basic')));
    // Only pnpm detected; runnersUp empty.
    expect(r.runnersUp).toHaveLength(0);
    expect(r.status).toBe('RESOLVED');
  });

  test('monorepo wins HIGH on the repo root (yarn-npm workspace)', () => {
    const r = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(REPO_ROOT));
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('@arch-engine/adapter-monorepo');
    expect(r.detection?.confidence).toBe('HIGH');
  });

  test('pnpm-empty-globs returns MEDIUM (globs match nothing)', () => {
    const r = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(path.join(FIX, 'pnpm-empty-globs')));
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('pnpm');
    expect(r.detection?.confidence).toBe('MEDIUM');
  });

  test('deterministic replay across two invocations', () => {
    const a = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(path.join(FIX, 'pnpm-basic')));
    const b = selectArchitectureAdapter(buildRegistry(), ctxWithPnpmHint(path.join(FIX, 'pnpm-basic')));
    expect(a.selected?.adapter.adapterName).toBe(b.selected?.adapter.adapterName);
    expect(a.detection?.confidence).toBe(b.detection?.confidence);
  });
});

describe('Adapter selection — pnpm hint absent (back-compat path)', () => {
  test('without pnpm hint, monorepo still claims pnpm-workspace.yaml (Pass 1 fallback)', () => {
    // Simulates the case where @arch-engine/adapter-pnpm is NOT installed.
    const registryWithoutPnpm = [
      registerArchitectureAdapter(monorepoArchitectureAdapter as unknown as ArchitectureAdapter, 4),
    ];
    const ctx = createAdapterContext(path.join(FIX, 'pnpm-basic'));
    const r = selectArchitectureAdapter(registryWithoutPnpm, ctx);
    expect(r.status).toBe('RESOLVED');
    expect(r.selected?.adapter.adapterName).toBe('@arch-engine/adapter-monorepo');
    expect(r.detection?.confidence).toBe('HIGH');
    expect(r.detection?.workspaceKind).toBe('pnpm-workspace');
  });
});
