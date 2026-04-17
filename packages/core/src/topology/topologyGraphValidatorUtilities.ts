import type { TopologyGraph } from './TopologyGraph';
import type { TopologyGraphIndex } from './TopologyGraphIndex';
import type { GraphValidatorUtilityResult } from './graph-validator-utility-result';
import { getNodeById } from './topologyGraphTraversal';
import { hasPath, getDirectNeighbors } from './topologyGraphReachability';

export function validateNodeExists(
  graph: TopologyGraph,
  nodeId: string
): GraphValidatorUtilityResult {
  const node = getNodeById(graph, nodeId);
  if (!node) {
    return {
      success: false,
      code: 'NODE_MISSING',
      message: `Required node not found: ${nodeId}`
    };
  }
  return {
    success: true,
    code: 'NODE_EXISTS',
    message: `Node exists: ${nodeId}`
  };
}

export function validateRequiredEdge(
  graph: TopologyGraph,
  from: string,
  to: string,
  type: string
): GraphValidatorUtilityResult {
  const edge = graph.edges.find(e => e.from === from && e.to === to && e.type === type);
  if (!edge) {
    return {
      success: false,
      code: 'EDGE_MISSING',
      message: `Required edge missing: ${from} -> ${to} (${type})`
    };
  }
  return {
    success: true,
    code: 'EDGE_EXISTS',
    message: `Edge exists: ${from} -> ${to} (${type})`
  };
}

export function validateReachability(
  index: TopologyGraphIndex,
  from: string,
  to: string
): GraphValidatorUtilityResult {
  const reachable = hasPath(index, from, to);
  if (!reachable) {
    return {
      success: false,
      code: 'PATH_MISSING',
      message: `No reachability path found from ${from} to ${to}`
    };
  }
  return {
    success: true,
    code: 'PATH_EXISTS',
    message: `Path exists from ${from} to ${to}`
  };
}

export function validateRequiredNeighbors(
  index: TopologyGraphIndex,
  nodeId: string,
  expectedNeighborIds: readonly string[]
): GraphValidatorUtilityResult {
  const actualNeighbors = getDirectNeighbors(index, nodeId);
  const actualIds = new Set(actualNeighbors.map(n => n.id));
  
  const missing: string[] = [];
  for (const exp of expectedNeighborIds) {
    if (!actualIds.has(exp)) {
      missing.push(exp);
    }
  }

  if (missing.length > 0) {
    missing.sort((a, b) => a.localeCompare(b));
    return {
      success: false,
      code: 'NEIGHBORS_MISSING',
      message: `Required neighbors missing for ${nodeId}: ${missing.join(', ')}`
    };
  }
  
  return {
    success: true,
    code: 'NEIGHBORS_MATCH',
    message: `All required neighbors exist for ${nodeId}`
  };
}
