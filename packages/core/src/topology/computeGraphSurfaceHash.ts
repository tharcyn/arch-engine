import * as crypto from 'node:crypto';
import type { TopologyNode } from './TopologyNode';
import type { TopologyEdge } from './TopologyEdge';

export function computeGraphSurfaceHash(
  nodes: readonly TopologyNode[],
  edges: readonly TopologyEdge[]
): string {
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    return a.type.localeCompare(b.type);
  });

  const sortObjectKeys = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    return Object.keys(obj).sort().reduce((result: Record<string, any>, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
  };

  const payload = {
    graphSurfaceVersion: "1.0.0",
    nodes: sortedNodes,
    edges: sortedEdges,
  };

  const deterministicString = JSON.stringify(sortObjectKeys(payload));
  return crypto.createHash('sha256').update(deterministicString).digest('hex');
}
