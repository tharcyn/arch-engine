import { describe, test, expect } from 'vitest';
import { validateTopologySnapshotLineage } from '../../src/topology/validateTopologySnapshotLineage';
import type { TopologySnapshot } from '../../src/topology/TopologySnapshot';

/**
 * ═══════════════════════════════════════════════════════════
 *  Phase 8D — Snapshot Identity & Lineage Surface
 * ═══════════════════════════════════════════════════════════
 */
describe('Phase 8D Snapshot Identity & Lineage Surface', () => {

  const graph: any = { nodes: [], edges: [] };

  const snapshotNoLineage: TopologySnapshot = {
    snapshotSurfaceVersion: "1.0.0",
    topologyGraph: graph,
  };

  const snapshotLineageA: TopologySnapshot = {
    snapshotSurfaceVersion: "1.0.0",
    topologyGraph: graph,
    lineageId: "alpha",
  };

  const snapshotLineageB: TopologySnapshot = {
    snapshotSurfaceVersion: "1.0.0",
    topologyGraph: graph,
    lineageId: "beta",
  };

  test('snapshot_lineage_equal_is_compatible', () => {
    const result = validateTopologySnapshotLineage(snapshotLineageA, snapshotLineageA);
    expect(result.compatible).toBe(true);
    expect(result.currentLineageId).toBe("alpha");
    expect(result.baselineLineageId).toBe("alpha");
  });

  test('snapshot_lineage_missing_is_compatible', () => {
    // Both missing
    expect(validateTopologySnapshotLineage(snapshotNoLineage, snapshotNoLineage).compatible).toBe(true);
    // Current missing
    expect(validateTopologySnapshotLineage(snapshotNoLineage, snapshotLineageA).compatible).toBe(true);
    // Baseline missing
    expect(validateTopologySnapshotLineage(snapshotLineageA, snapshotNoLineage).compatible).toBe(true);
  });

  test('snapshot_lineage_mismatch_is_incompatible', () => {
    const result = validateTopologySnapshotLineage(snapshotLineageA, snapshotLineageB);
    expect(result.compatible).toBe(false);
    expect(result.currentLineageId).toBe("alpha");
    expect(result.baselineLineageId).toBe("beta");
  });
});
