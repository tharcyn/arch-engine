import type { TopologyGraph } from './TopologyGraph';
import type { TopologySnapshot } from './TopologySnapshot';

// TopologySnapshot provides deterministic baseline persistence
// for architecture drift detection comparisons via --baseline flag

/**
 * Builds a TopologySnapshot from a TopologyGraph.
 *
 * The graph is passed by reference — no cloning occurs.
 * Returns a frozen, deterministic snapshot envelope.
 *
 * Phase 7B — Snapshot Persistence Surface
 */
export function buildTopologySnapshot(
  graph: TopologyGraph,
  lineageId?: string
): TopologySnapshot {
  const snapshot: any = {
    snapshotSurfaceVersion: "1.0.0",
    topologyGraph: graph,
  };

  if (lineageId !== undefined) {
    snapshot.lineageId = lineageId;
  }

  return Object.freeze(snapshot as TopologySnapshot);
}
