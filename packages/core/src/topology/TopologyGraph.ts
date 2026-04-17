import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';

export interface TopologyGraph {
  readonly graphSurfaceVersion: "1.0.0";
  // Deterministic identity hash of the topology graph contract surface.
  // Independent from ingestion schema version, projectionSurfaceVersion,
  // projectionSurfaceHash, and validator executionSurfaceVersion.
  readonly graphSurfaceHash: string;
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
}
