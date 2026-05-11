/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase G — Drift engine unit tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure unit tests for `computeArchitectureDrift` and the
 *  canonical topology emitter. No filesystem, no subprocess.
 */

import { describe, expect, test } from 'vitest';
import {
  buildCanonicalTopology,
  buildCanonicalTopologyFromAdjacencyMap,
  computeGraphSurfaceHash,
  edgeId,
  isCanonicalTopologyShape,
  CANONICAL_GRAPH_SURFACE_VERSION,
} from '../src/canonical-topology.js';
import {
  computeArchitectureDrift,
  buildDriftJsonBlock,
  buildDriftSummaryMirror,
  buildDriftHeadlineSuffix,
} from '../src/drift.js';

// ═══════════════════════════════════════════════════════════
//  Canonical topology determinism
// ═══════════════════════════════════════════════════════════

describe('Phase G — canonical topology emitter', () => {
  test('emits graphSurfaceVersion 1.0.0', () => {
    const t = buildCanonicalTopology([], []);
    expect(t.graphSurfaceVersion).toBe('1.0.0');
    expect(t.graphSurfaceVersion).toBe(CANONICAL_GRAPH_SURFACE_VERSION);
  });

  test('nodes sorted by id ascending', () => {
    const t = buildCanonicalTopology(['z', 'a', 'm'], []);
    expect(t.nodes.map((n) => n.id)).toEqual(['a', 'm', 'z']);
  });

  test('edges sorted by id ascending', () => {
    const t = buildCanonicalTopology(
      ['a', 'b', 'c'],
      [
        { from: 'c', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    );
    const ids = t.edges.map((e) => e.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  test('de-duplicates identical edges', () => {
    const t = buildCanonicalTopology(
      ['a', 'b'],
      [
        { from: 'a', to: 'b', type: 'workspace_dependency' },
        { from: 'a', to: 'b', type: 'workspace_dependency' },
      ],
    );
    expect(t.edges).toHaveLength(1);
  });

  test('edge id is "e_" + sha256(from|to|type)[0..8]', () => {
    expect(edgeId('a', 'b', 'workspace_dependency')).toMatch(/^e_[a-f0-9]{8}$/);
  });

  test('graphSurfaceHash is deterministic across runs', () => {
    const a = buildCanonicalTopology(['x', 'y'], [{ from: 'x', to: 'y' }]);
    const b = buildCanonicalTopology(['y', 'x'], [{ from: 'x', to: 'y' }]);
    expect(a.graphSurfaceHash).toBe(b.graphSurfaceHash);
  });

  test('graphSurfaceHash changes when topology changes', () => {
    const a = buildCanonicalTopology(['x', 'y'], [{ from: 'x', to: 'y' }]);
    const b = buildCanonicalTopology(['x', 'y', 'z'], [{ from: 'x', to: 'y' }]);
    expect(a.graphSurfaceHash).not.toBe(b.graphSurfaceHash);
  });

  test('hash distinguishes empty-nodes / empty-edges placements', () => {
    const a = buildCanonicalTopology([], []);
    const b = buildCanonicalTopology(['a'], []);
    expect(a.graphSurfaceHash).not.toBe(b.graphSurfaceHash);
  });

  test('isCanonicalTopologyShape accepts valid shape', () => {
    const t = buildCanonicalTopology(['a'], [{ from: 'a', to: 'a' }]);
    expect(isCanonicalTopologyShape(t)).toBe(true);
  });

  test('isCanonicalTopologyShape rejects missing fields', () => {
    expect(isCanonicalTopologyShape({ nodes: [], edges: [] })).toBe(false);
    expect(isCanonicalTopologyShape({})).toBe(false);
    expect(isCanonicalTopologyShape(null)).toBe(false);
  });

  test('buildCanonicalTopologyFromAdjacencyMap produces the same hash as buildCanonicalTopology for equivalent inputs', () => {
    const adj = { 'a': ['b'], 'b': [] };
    const fromAdj = buildCanonicalTopologyFromAdjacencyMap(adj);
    const explicit = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b', type: 'workspace_dependency' }]);
    expect(fromAdj.graphSurfaceHash).toBe(explicit.graphSurfaceHash);
  });

  test('computeGraphSurfaceHash returns 64-hex string', () => {
    const h = computeGraphSurfaceHash([], []);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ═══════════════════════════════════════════════════════════
//  Drift engine — topology axis
// ═══════════════════════════════════════════════════════════

const EMPTY_SIGNALS = {
  score: null,
  coverage: null,
  connectivity: null,
  confidence: null,
  violationsCount: null,
};

function inputFromTopology(topology: ReturnType<typeof buildCanonicalTopology>) {
  return { canonical: topology, violations: [], signals: EMPTY_SIGNALS };
}

describe('Phase G — drift engine: topology axis', () => {
  test('identical baseline/current → zero drift', () => {
    const t = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]);
    const d = computeArchitectureDrift(inputFromTopology(t), inputFromTopology(t));
    expect(d.hasDrift).toBe(false);
    expect(d.summary.graphSurfaceHashChanged).toBe(false);
    expect(d.topology.addedNodes).toEqual([]);
    expect(d.topology.removedNodes).toEqual([]);
    expect(d.topology.addedEdges).toEqual([]);
    expect(d.topology.removedEdges).toEqual([]);
  });

  test('added node and added edge', () => {
    const base = buildCanonicalTopology(['a'], []);
    const curr = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]);
    const d = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    expect(d.hasDrift).toBe(true);
    expect(d.summary.addedNodes).toBe(1);
    expect(d.summary.addedEdges).toBe(1);
    expect(d.summary.removedNodes).toBe(0);
    expect(d.summary.removedEdges).toBe(0);
    expect(d.topology.addedNodes[0].id).toBe('b');
    expect(d.topology.addedEdges[0].from).toBe('a');
    expect(d.topology.addedEdges[0].to).toBe('b');
  });

  test('removed node and removed edge', () => {
    const base = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]);
    const curr = buildCanonicalTopology(['a'], []);
    const d = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    expect(d.summary.removedNodes).toBe(1);
    expect(d.summary.removedEdges).toBe(1);
    expect(d.topology.removedNodes[0].id).toBe('b');
  });

  test('changed* arrays always empty in v1.2', () => {
    const base = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]);
    const curr = buildCanonicalTopology(['a', 'c'], [{ from: 'a', to: 'c' }]);
    const d = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    expect(d.topology.changedNodes).toEqual([]);
    expect(d.topology.changedEdges).toEqual([]);
    expect(d.summary.changedNodes).toBe(0);
    expect(d.summary.changedEdges).toBe(0);
  });

  test('all topology arrays sorted by id ascending', () => {
    const base = buildCanonicalTopology(['a', 'b', 'c'], []);
    const curr = buildCanonicalTopology(
      ['a', 'b', 'c', 'd', 'e', 'f'],
      [
        { from: 'a', to: 'd' },
        { from: 'a', to: 'e' },
        { from: 'a', to: 'f' },
      ],
    );
    const d = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    const nodeIds = d.topology.addedNodes.map((n) => n.id);
    expect(nodeIds).toEqual([...nodeIds].sort());
    const edgeIds = d.topology.addedEdges.map((e) => e.id);
    expect(edgeIds).toEqual([...edgeIds].sort());
  });
});

// ═══════════════════════════════════════════════════════════
//  Drift engine — policy axis
// ═══════════════════════════════════════════════════════════

describe('Phase G — drift engine: policy axis', () => {
  test('new violation detected', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      { canonical: t, violations: [], signals: EMPTY_SIGNALS },
      {
        canonical: t,
        violations: [{ id: 'v_aabbccdd', ruleId: 'no-frontend-to-payments', severity: 'error' }],
        signals: EMPTY_SIGNALS,
      },
    );
    expect(d.summary.newViolations).toBe(1);
    expect(d.violations.new).toHaveLength(1);
    expect(d.violations.new[0].id).toBe('v_aabbccdd');
  });

  test('resolved violation detected', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      {
        canonical: t,
        violations: [{ id: 'v_old', ruleId: 'old-rule', severity: 'error' }],
        signals: EMPTY_SIGNALS,
      },
      { canonical: t, violations: [], signals: EMPTY_SIGNALS },
    );
    expect(d.summary.resolvedViolations).toBe(1);
    expect(d.violations.resolved).toHaveLength(1);
  });

  test('persisted violation detected', () => {
    const t = buildCanonicalTopology([], []);
    const v = { id: 'v_same', ruleId: 'same-rule', severity: 'error' };
    const d = computeArchitectureDrift(
      { canonical: t, violations: [v], signals: EMPTY_SIGNALS },
      { canonical: t, violations: [v], signals: EMPTY_SIGNALS },
    );
    expect(d.summary.persistedViolations).toBe(1);
    expect(d.summary.newViolations).toBe(0);
    expect(d.summary.resolvedViolations).toBe(0);
  });

  test('severity changed detected', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      {
        canonical: t,
        violations: [{ id: 'v_x', severity: 'warning' }],
        signals: EMPTY_SIGNALS,
      },
      {
        canonical: t,
        violations: [{ id: 'v_x', severity: 'error' }],
        signals: EMPTY_SIGNALS,
      },
    );
    expect(d.summary.violationSeverityChanged).toBe(1);
    expect(d.violations.severityChanged[0]).toEqual({
      id: 'v_x',
      ruleId: undefined,
      from: 'warning',
      to: 'error',
    });
  });

  test('violations sorted by id ascending across all four buckets', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      {
        canonical: t,
        violations: [{ id: 'v_y' }, { id: 'v_a' }, { id: 'v_m' }],
        signals: EMPTY_SIGNALS,
      },
      {
        canonical: t,
        violations: [{ id: 'v_z' }, { id: 'v_b' }, { id: 'v_y' }, { id: 'v_a' }],
        signals: EMPTY_SIGNALS,
      },
    );
    expect(d.violations.new.map((v) => v.id)).toEqual(['v_b', 'v_z']);
    expect(d.violations.resolved.map((v) => v.id)).toEqual(['v_m']);
    expect(d.violations.persisted.map((v) => v.id)).toEqual(['v_a', 'v_y']);
  });

  test('fallback id when violation lacks id', () => {
    const t = buildCanonicalTopology([], []);
    const v = { ruleId: 'rule', edge: { from: 'a', to: 'b', type: 'workspace_dependency' }, severity: 'error' };
    const d = computeArchitectureDrift(
      { canonical: t, violations: [v], signals: EMPTY_SIGNALS },
      { canonical: t, violations: [v], signals: EMPTY_SIGNALS },
    );
    // The same violation should be persisted, not double-counted.
    expect(d.summary.persistedViolations).toBe(1);
    expect(d.summary.newViolations).toBe(0);
    expect(d.summary.resolvedViolations).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
//  Drift engine — signal axis
// ═══════════════════════════════════════════════════════════

describe('Phase G — drift engine: signal axis', () => {
  test('score / coverage / connectivity / confidence deltas computed', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      {
        canonical: t,
        violations: [],
        signals: { score: 0.8, coverage: 1.0, connectivity: 0.9, confidence: 0.85, violationsCount: 0 },
      },
      {
        canonical: t,
        violations: [],
        signals: { score: 0.5, coverage: 0.9, connectivity: 1.0, confidence: 0.85, violationsCount: 1 },
      },
    );
    expect(d.signal.scoreDelta).toBeCloseTo(-0.3, 5);
    expect(d.signal.coverageDelta).toBeCloseTo(-0.1, 5);
    expect(d.signal.connectivityDelta).toBeCloseTo(0.1, 5);
    expect(d.signal.confidenceDelta).toBeCloseTo(0, 5);
    expect(d.signal.violationsDelta).toBe(1);
  });

  test('null baseline-side scalar → null delta', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      { canonical: t, violations: [], signals: EMPTY_SIGNALS },
      {
        canonical: t,
        violations: [],
        signals: { score: 0.5, coverage: null, connectivity: null, confidence: null, violationsCount: null },
      },
    );
    expect(d.signal.scoreDelta).toBeNull();
    expect(d.signal.coverageDelta).toBeNull();
  });

  test('graphSurfaceHashChanged flips when topology differs', () => {
    const base = buildCanonicalTopology(['a'], []);
    const curr = buildCanonicalTopology(['b'], []);
    const d = computeArchitectureDrift(
      { canonical: base, violations: [], signals: EMPTY_SIGNALS },
      { canonical: curr, violations: [], signals: EMPTY_SIGNALS },
    );
    expect(d.signal.graphSurfaceHashChanged).toBe(true);
    expect(d.summary.graphSurfaceHashChanged).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
//  Drift JSON block + summary mirror + headline suffix
// ═══════════════════════════════════════════════════════════

describe('Phase G — drift serialisation helpers', () => {
  test('buildDriftJsonBlock includes baseline metadata', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      inputFromTopology(t),
      inputFromTopology(t),
    );
    const json = buildDriftJsonBlock(d, {
      path: 'baseline.json',
      schemaVersion: 'arch-engine.cli.v2',
      command: 'check',
      archEngineVersion: '1.2.0',
      emittedAt: '2026-05-11T00:00:00Z',
      graphSurfaceHash: 'abc',
    });
    expect((json.baseline as any).path).toBe('baseline.json');
    expect((json.baseline as any).command).toBe('check');
    expect((json.baseline as any).graphSurfaceHash).toBe('abc');
  });

  test('buildDriftSummaryMirror surfaces top-line counters', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      inputFromTopology(t),
      {
        canonical: buildCanonicalTopology(['a'], []),
        violations: [{ id: 'v_a' }],
        signals: EMPTY_SIGNALS,
      },
    );
    const mirror = buildDriftSummaryMirror(d);
    expect(mirror.newViolations).toBe(1);
    expect(mirror.resolvedViolations).toBe(0);
    expect(mirror.addedEdges).toBe(0);
    expect(mirror.removedEdges).toBe(0);
  });

  test('buildDriftHeadlineSuffix renders concise summary', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(
      inputFromTopology(t),
      {
        canonical: buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]),
        violations: [{ id: 'v_a' }],
        signals: EMPTY_SIGNALS,
      },
    );
    const suffix = buildDriftHeadlineSuffix(d);
    expect(suffix).toMatch(/drift:/);
    expect(suffix).toMatch(/violation/);
    expect(suffix).toMatch(/edge/);
  });

  test('buildDriftHeadlineSuffix returns empty when no drift', () => {
    const t = buildCanonicalTopology([], []);
    const d = computeArchitectureDrift(inputFromTopology(t), inputFromTopology(t));
    expect(buildDriftHeadlineSuffix(d)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
//  Determinism
// ═══════════════════════════════════════════════════════════

describe('Phase G — drift engine: determinism', () => {
  test('same inputs → byte-identical output', () => {
    const base = buildCanonicalTopology(['a', 'b'], [{ from: 'a', to: 'b' }]);
    const curr = buildCanonicalTopology(['a', 'b', 'c'], [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ]);
    const d1 = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    const d2 = computeArchitectureDrift(inputFromTopology(base), inputFromTopology(curr));
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  test('swapping baseline/current swaps added/removed', () => {
    const a = buildCanonicalTopology(['a'], []);
    const b = buildCanonicalTopology(['a', 'b'], []);
    const fwd = computeArchitectureDrift(inputFromTopology(a), inputFromTopology(b));
    const rev = computeArchitectureDrift(inputFromTopology(b), inputFromTopology(a));
    expect(fwd.summary.addedNodes).toBe(rev.summary.removedNodes);
    expect(fwd.summary.removedNodes).toBe(rev.summary.addedNodes);
  });
});
