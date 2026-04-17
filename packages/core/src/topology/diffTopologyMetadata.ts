import type { TopologyGraph } from './TopologyGraph';
import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';
import type { TopologyMetadataDiff, NodeMetadataChange, EdgeMetadataChange } from './TopologyMetadataDiff';

function stableStringify(obj: any): string {
  if (obj === undefined) return '';
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    const arrStr = obj.map(item => {
      const res = stableStringify(item);
      return res === '' ? 'null' : res; // JSON.stringify(undefined) tracking
    });
    return `[${arrStr.join(',')}]`;
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const cleanStrParts: string[] = [];
  for (const key of sortedKeys) {
    if (obj[key] !== undefined) {
      const valStr = stableStringify(obj[key]);
      if (valStr !== '') {
        cleanStrParts.push(`"${key}":${valStr}`);
      }
    }
  }
  return `{${cleanStrParts.join(',')}}`;
}

const hashEdge = (edge: TopologyEdge) => `${edge.from}|${edge.to}|${edge.type}`;

export function diffTopologyMetadata(
  before: TopologyGraph,
  after: TopologyGraph
): TopologyMetadataDiff {
  const nodeMetadataChanges: NodeMetadataChange[] = [];
  const edgeMetadataChanges: EdgeMetadataChange[] = [];

  const beforeNodes = new Map<string, TopologyNode>(before.nodes.map(n => [n.id, n]));
  for (const afterNode of after.nodes) {
    const beforeNode = beforeNodes.get(afterNode.id);
    if (beforeNode) {
      const beforeStr = stableStringify(beforeNode.metadata);
      const afterStr = stableStringify(afterNode.metadata);
      if (beforeStr !== afterStr) {
        nodeMetadataChanges.push(Object.freeze({
          nodeId: afterNode.id,
          beforeMetadata: beforeNode.metadata ? { ...beforeNode.metadata } : undefined,
          afterMetadata: afterNode.metadata ? { ...afterNode.metadata } : undefined,
        }));
      }
    }
  }

  const beforeEdges = new Map<string, TopologyEdge>(before.edges.map(e => [hashEdge(e), e]));
  for (const afterEdge of after.edges) {
    const beforeEdge = beforeEdges.get(hashEdge(afterEdge));
    if (beforeEdge) {
      const beforeStr = stableStringify(beforeEdge.metadata);
      const afterStr = stableStringify(afterEdge.metadata);
      if (beforeStr !== afterStr) {
        edgeMetadataChanges.push(Object.freeze({
          from: afterEdge.from,
          to: afterEdge.to,
          type: afterEdge.type,
          beforeMetadata: beforeEdge.metadata ? { ...beforeEdge.metadata } : undefined,
          afterMetadata: afterEdge.metadata ? { ...afterEdge.metadata } : undefined,
        }));
      }
    }
  }

  nodeMetadataChanges.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  edgeMetadataChanges.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    return a.type.localeCompare(b.type);
  });

  return Object.freeze({
    nodeMetadataChanges: Object.freeze(nodeMetadataChanges),
    edgeMetadataChanges: Object.freeze(edgeMetadataChanges)
  });
}
