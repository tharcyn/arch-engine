import type { TopologyGraph } from './TopologyGraph';
import type { TopologySnapshot } from './TopologySnapshot';

// Enables snapshots to operate as first-class topology sources
// allowing snapshot-only governance comparisons without dataset ingestion

/**
 * Extracts a TopologyGraph from a TopologySnapshot.
 *
 * Pure deterministic passthrough — no cloning, no mutation.
 * The graph is returned by reference.
 *
 * Phase 7D — Snapshot Graph Extraction Surface
 */
export function extractTopologyGraphFromSnapshot(
  snapshot: TopologySnapshot
): TopologyGraph {
  return snapshot.topologyGraph;
}
