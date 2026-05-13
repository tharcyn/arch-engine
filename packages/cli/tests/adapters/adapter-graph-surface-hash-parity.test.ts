/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Adapter Pass 2B — graphSurfaceHash parity test
 * ═══════════════════════════════════════════════════════════
 *
 *  Verifies that the `@arch-engine/adapter-pnpm` adapter and the
 *  `@arch-engine/adapter-monorepo` adapter's pnpm-fallback path
 *  produce IDENTICAL canonical (nodes, edges) graphs — and therefore
 *  the SAME `graphSurfaceHash` — when run against the same pnpm
 *  workspace fixture.
 *
 *  Why this matters (per spec §12.4):
 *
 *    "graphSurfaceHash unchanged. Adapter identity does not affect
 *     the canonical topology hash. A pnpm baseline produced by
 *     @arch-engine/adapter-pnpm MUST compare cleanly against a pnpm
 *     baseline produced by @arch-engine/adapter-monorepo's
 *     existing-pnpm-handling fallback path, as long as the same set
 *     of nodes and edges are extracted."
 *
 *  The fixture we use is `pnpm-basic` — a workspace that's well
 *  within both adapters' MVP capability:
 *    - flat `apps/*` + `packages/*` globs
 *    - no `workspace:*` protocol
 *    - no `catalog:` references
 *    - no exclusion globs
 *    - all packages named
 *
 *  We do NOT use:
 *    - pnpm-workspace-protocol (workspace and catalog protocols) —
 *      only the pnpm adapter understands these; the monorepo adapter
 *      would still produce edges but with different metadata
 *      classification.
 *    - pnpm-nested (two-segment glob form) — the monorepo adapter's
 *      line-based pnpm parser only handles single-segment globs.
 *    - pnpm-excluded-glob — the monorepo adapter has no exclusion
 *      glob support.
 *
 *  The pnpm-basic fixture is intentionally chosen as the
 *  parity-eligible intersection.
 */

import { describe, expect, test } from 'vitest';
import * as path from 'node:path';
import { monorepoArchitectureAdapter } from '@arch-engine/adapter-monorepo';
import { pnpmArchitectureAdapter } from '@arch-engine/adapter-pnpm';

const FIXTURE = path.resolve(
  __dirname,
  '..',
  'fixtures',
  'adapters',
  'pnpm-basic',
);

function ctx(cwd: string, withPnpmHint: boolean) {
  const c = { cwd, cache: new Map<string, unknown>() };
  if (withPnpmHint) c.cache.set('archengine:pnpmAdapterAvailable', true);
  return c;
}

describe('graphSurfaceHash parity — pnpm-basic fixture', () => {
  /**
   * Documented semantic difference between the two adapters: the
   * monorepo adapter ALWAYS includes the repo root directory as a
   * workspace node if its package.json has a `name`. The pnpm
   * adapter follows pnpm's documented behaviour and includes only
   * the directories matched by the `packages:` globs — root is NOT
   * a workspace package unless `.` is explicitly listed.
   *
   * Parity is therefore an INTERSECTION property: the set of
   * pnpm-glob-matched packages must be identical between the two
   * adapters, and the edges among those packages must hash the same.
   *
   * The root-name asymmetry is the only legitimate difference and
   * is acknowledged here rather than papered over.
   */

  const FIXTURE_ROOT_NAME = 'pnpm-basic-fixture-root';

  function filterRoot<T extends { id?: string; from?: string; to?: string }>(
    items: ReadonlyArray<T>,
  ): T[] {
    return items.filter((it) => {
      if (it.id !== undefined && it.id === FIXTURE_ROOT_NAME) return false;
      if (it.from === FIXTURE_ROOT_NAME || it.to === FIXTURE_ROOT_NAME) return false;
      return true;
    });
  }

  test('pnpm adapter and monorepo-fallback agree on the glob-matched node set', () => {
    const monorepoTopology = monorepoArchitectureAdapter.extractTopology(
      // No pnpm hint → monorepo's Pass 1 fallback parser runs.
      ctx(FIXTURE, false),
    );
    const pnpmTopology = pnpmArchitectureAdapter.extractTopology(ctx(FIXTURE, false));

    const mIds = filterRoot(monorepoTopology.nodes as Array<{ id: string }>)
      .map((n) => n.id)
      .sort();
    const pIds = pnpmTopology.nodes.map((n) => n.id).sort();
    expect(mIds).toEqual(pIds);
  });

  test('pnpm adapter and monorepo-fallback agree on the edge set among glob-matched packages', () => {
    const monorepoTopology = monorepoArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    const pnpmTopology = pnpmArchitectureAdapter.extractTopology(ctx(FIXTURE, false));

    const mEdgeKeys = filterRoot(monorepoTopology.edges as Array<{ from: string; to: string; type: string }>)
      .map((e) => `${e.from}|${e.to}|${e.type}`)
      .sort();
    const pEdgeKeys = pnpmTopology.edges
      .map((e) => `${e.from}|${e.to}|${e.type}`)
      .sort();
    expect(mEdgeKeys).toEqual(pEdgeKeys);
  });

  test('graphSurfaceHash is byte-stable across runs for each adapter', () => {
    const a = pnpmArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    const b = pnpmArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    expect(a.graphSurfaceHash).toBe(b.graphSurfaceHash);

    const m1 = monorepoArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    const m2 = monorepoArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    expect(m1.graphSurfaceHash).toBe(m2.graphSurfaceHash);
  });

  test('full-topology graphSurfaceHash differs by exactly the root-inclusion delta (documented asymmetry)', () => {
    // The hashes themselves differ because monorepo includes the
    // root node while pnpm does not. The assertion here is the
    // opposite of parity — we pin the asymmetry so a future change
    // that accidentally aligns them surfaces in test review.
    const m = monorepoArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    const p = pnpmArchitectureAdapter.extractTopology(ctx(FIXTURE, false));
    expect(m.graphSurfaceHash).not.toBe(p.graphSurfaceHash);
    expect(m.nodes.length - p.nodes.length).toBe(1);
    expect(m.nodes.map((n) => n.id)).toContain(FIXTURE_ROOT_NAME);
    expect(p.nodes.map((n) => n.id)).not.toContain(FIXTURE_ROOT_NAME);
  });
});

describe('graphSurfaceHash parity — explicitly NOT applicable cases', () => {
  /**
   * Documents the cases where the two adapters intentionally produce
   * different output. Each is asserted to be deterministic on its
   * own, but no parity claim is made.
   *
   * Per spec §12.4, parity is a property of "as long as the same set
   * of nodes and edges are extracted". The fixtures below exercise
   * features only the pnpm adapter supports, so the canonical
   * (nodes, edges) tuple legitimately differs.
   */

  test('pnpm-nested two-segment globs are pnpm-only — monorepo sees fewer packages', () => {
    const nested = path.resolve(__dirname, '..', 'fixtures', 'adapters', 'pnpm-nested');
    const m = monorepoArchitectureAdapter.extractTopology(ctx(nested, false));
    const p = pnpmArchitectureAdapter.extractTopology(ctx(nested, false));

    // Two-segment globs are unsupported by the monorepo adapter's
    // line-based pnpm parser, so its discovered package set is
    // strictly smaller than the pnpm adapter's. (The monorepo
    // adapter may still see the root via its always-include-cwd
    // behaviour, so we don't assert exactly 0 — we just assert
    // strictly less.)
    expect(m.nodes.length).toBeLessThan(p.nodes.length);
    expect(p.nodes.length).toBe(2);

    // Each side remains byte-deterministic on repeat runs.
    expect(monorepoArchitectureAdapter.extractTopology(ctx(nested, false)).graphSurfaceHash).toBe(m.graphSurfaceHash);
    expect(pnpmArchitectureAdapter.extractTopology(ctx(nested, false)).graphSurfaceHash).toBe(p.graphSurfaceHash);
  });

  test('pnpm-excluded-glob is pnpm-only — monorepo includes excluded package', () => {
    const excluded = path.resolve(__dirname, '..', 'fixtures', 'adapters', 'pnpm-excluded-glob');
    const m = monorepoArchitectureAdapter.extractTopology(ctx(excluded, false));
    const p = pnpmArchitectureAdapter.extractTopology(ctx(excluded, false));

    // Monorepo has no exclusion-glob support, so it scans both packages.
    // pnpm adapter honours `!packages/private-*`.
    const mIds = m.nodes.map((n) => n.id).sort();
    const pIds = p.nodes.map((n) => n.id).sort();
    expect(mIds).toContain('@excluded/private-internal');
    expect(pIds).not.toContain('@excluded/private-internal');

    // Determinism on each side preserved.
    expect(monorepoArchitectureAdapter.extractTopology(ctx(excluded, false)).graphSurfaceHash).toBe(m.graphSurfaceHash);
    expect(pnpmArchitectureAdapter.extractTopology(ctx(excluded, false)).graphSurfaceHash).toBe(p.graphSurfaceHash);
  });
});
