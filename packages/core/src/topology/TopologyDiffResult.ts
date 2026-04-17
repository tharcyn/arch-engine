import type { TopologyEdge } from './TopologyEdge';

import type { TopologyMetadataDiff } from './TopologyMetadataDiff';

export interface TopologyDiffResult {
  readonly diffSurfaceVersion: "1.0.0";
  readonly metadataDiff?: TopologyMetadataDiff;

  readonly addedNodes: readonly string[];
  readonly removedNodes: readonly string[];

  readonly addedEdges: readonly TopologyEdge[];
  readonly removedEdges: readonly TopologyEdge[];
}
