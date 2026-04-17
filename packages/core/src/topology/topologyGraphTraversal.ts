import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';
import type { TopologyGraph } from './TopologyGraph';

export function getNodeById(
  graph: TopologyGraph,
  nodeId: string
): TopologyNode | undefined {
  return graph.nodes.find(node => node.id === nodeId);
}

export function getOutgoingEdges(
  graph: TopologyGraph,
  nodeId: string
): readonly TopologyEdge[] {
  return graph.edges.filter(edge => edge.from === nodeId);
}

export function getIncomingEdges(
  graph: TopologyGraph,
  nodeId: string
): readonly TopologyEdge[] {
  return graph.edges.filter(edge => edge.to === nodeId);
}
