import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';

export interface TopologyGraphIndex {
  readonly nodesById: ReadonlyMap<string, TopologyNode>;
  readonly outgoingByNodeId: ReadonlyMap<string, readonly TopologyEdge[]>;
  readonly incomingByNodeId: ReadonlyMap<string, readonly TopologyEdge[]>;
}
