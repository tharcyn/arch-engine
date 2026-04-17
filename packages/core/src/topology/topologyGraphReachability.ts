import type { TopologyGraphIndex } from './TopologyGraphIndex';
import type { TopologyNode } from './TopologyNode';

export function getDirectNeighbors(
  index: TopologyGraphIndex,
  nodeId: string
): readonly TopologyNode[] {
  const edges = index.outgoingByNodeId.get(nodeId);
  if (!edges) return [];
  const neighbors: TopologyNode[] = [];
  for (const edge of edges) {
    const neighbor = index.nodesById.get(edge.to);
    if (neighbor) {
      neighbors.push(neighbor);
    }
  }
  return Object.freeze(neighbors);
}

export function getReachableNodeIds(
  index: TopologyGraphIndex,
  fromNodeId: string
): readonly string[] {
  const visited = new Set<string>();
  const queue = [fromNodeId];
  const reachable: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      if (current !== fromNodeId) {
        reachable.push(current);
      }
      
      const outgoing = index.outgoingByNodeId.get(current);
      if (outgoing) {
        for (const edge of outgoing) {
          queue.push(edge.to);
        }
      }
    }
  }

  return Object.freeze(reachable);
}

export function hasPath(
  index: TopologyGraphIndex,
  fromNodeId: string,
  toNodeId: string
): boolean {
  if (fromNodeId === toNodeId) return true;
  
  const visited = new Set<string>();
  const queue = [fromNodeId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toNodeId) return true;
    
    if (!visited.has(current)) {
      visited.add(current);
      
      const outgoing = index.outgoingByNodeId.get(current);
      if (outgoing) {
        for (const edge of outgoing) {
          queue.push(edge.to);
        }
      }
    }
  }
  
  return false;
}
