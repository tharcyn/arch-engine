import type { TopologyGraph } from './TopologyGraph';

/**
 * Deterministic topology snapshot for baseline persistence.
 *
 * Used by the --write-baseline flag to produce reproducible
 * topology captures suitable for future drift detection
 * comparisons via --baseline.
 *
 * Phase 7B — Snapshot Persistence Surface
 */
export interface TopologySnapshot {

  readonly snapshotSurfaceVersion: "1.0.0";

  readonly topologyGraph: TopologyGraph;

  // lineageId optionally identifies snapshot provenance
  // enabling safe topology comparison across environments,
  // releases, and CI artifact chains
  readonly lineageId?: string;
}
