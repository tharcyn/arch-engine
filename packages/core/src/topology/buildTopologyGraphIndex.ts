import type { TopologyGraph } from './TopologyGraph';
import type { TopologyGraphIndex } from './TopologyGraphIndex';
import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';

export function buildTopologyGraphIndex(
  graph: TopologyGraph
): TopologyGraphIndex {
  const nodesById = new Map<string, TopologyNode>();
  const outgoingByNodeId = new Map<string, TopologyEdge[]>();
  const incomingByNodeId = new Map<string, TopologyEdge[]>();

  for (const node of graph.nodes) {
    nodesById.set(node.id, node);
  }

  for (const edge of graph.edges) {
    let outArr = outgoingByNodeId.get(edge.from);
    if (!outArr) {
      outArr = [];
      outgoingByNodeId.set(edge.from, outArr);
    }
    outArr.push(edge);

    let inArr = incomingByNodeId.get(edge.to);
    if (!inArr) {
      inArr = [];
      incomingByNodeId.set(edge.to, inArr);
    }
    inArr.push(edge);
  }

  // Freeze the arrays in the edge maps to guarantee deterministic immutability
  for (const [key, edges] of outgoingByNodeId.entries()) {
    outgoingByNodeId.set(key, Object.freeze([...edges]) as any);
  }
  for (const [key, edges] of incomingByNodeId.entries()) {
    incomingByNodeId.set(key, Object.freeze([...edges]) as any);
  }

  return {
    nodesById,
    outgoingByNodeId,
    incomingByNodeId
  };
}
