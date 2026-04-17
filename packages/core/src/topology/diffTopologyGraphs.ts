import type { TopologyGraph } from './TopologyGraph';
import type { TopologyEdge } from './TopologyEdge';
import type { TopologyDiffResult } from './TopologyDiffResult';
import { diffTopologyMetadata } from './diffTopologyMetadata';

export function diffTopologyGraphs(
  before: TopologyGraph,
  after: TopologyGraph
): TopologyDiffResult {
  const beforeNodeIds = new Set(before.nodes.map(n => n.id));
  const afterNodeIds = new Set(after.nodes.map(n => n.id));

  const addedNodes: string[] = [];
  const removedNodes: string[] = [];

  for (const id of afterNodeIds) {
    if (!beforeNodeIds.has(id)) addedNodes.push(id);
  }
  for (const id of beforeNodeIds) {
    if (!afterNodeIds.has(id)) removedNodes.push(id);
  }

  const hashEdge = (edge: TopologyEdge) => `${edge.from}|${edge.to}|${edge.type}`;

  const beforeEdges = new Map(before.edges.map(e => [hashEdge(e), e]));
  const afterEdges = new Map(after.edges.map(e => [hashEdge(e), e]));

  const addedEdges: TopologyEdge[] = [];
  const removedEdges: TopologyEdge[] = [];

  for (const [hash, edge] of afterEdges) {
    if (!beforeEdges.has(hash)) addedEdges.push(edge);
  }
  for (const [hash, edge] of beforeEdges) {
    if (!afterEdges.has(hash)) removedEdges.push(edge);
  }

  addedNodes.sort((a, b) => a.localeCompare(b));
  removedNodes.sort((a, b) => a.localeCompare(b));

  const sortEdges = (a: TopologyEdge, b: TopologyEdge) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    return a.type.localeCompare(b.type);
  };

  addedEdges.sort(sortEdges);
  removedEdges.sort(sortEdges);

  const metadataDiff = diffTopologyMetadata(before, after);
  const includeMetadata = metadataDiff.nodeMetadataChanges.length > 0 || metadataDiff.edgeMetadataChanges.length > 0;

  return Object.freeze({
    diffSurfaceVersion: "1.0.0",
    ...(includeMetadata ? { metadataDiff } : {}),
    addedNodes: Object.freeze(addedNodes),
    removedNodes: Object.freeze(removedNodes),
    addedEdges: Object.freeze(addedEdges),
    removedEdges: Object.freeze(removedEdges),
  });
}
