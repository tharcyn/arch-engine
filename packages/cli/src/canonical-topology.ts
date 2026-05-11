/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Canonical topology emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Builds the `data.topology.canonical` sub-object that v1.2.0
 *  JSON v2 outputs include unconditionally on `inspect`,
 *  `analyze`, and `check`. The shape is locked by
 *  docs/cli/baseline-comparison-spec.md §11.2:
 *
 *    canonical = {
 *      graphSurfaceVersion: "1.0.0",
 *      graphSurfaceHash:    "<64-hex>",
 *      nodes: [
 *        { id: "<package-name>", type: "package" },
 *        ...
 *      ],
 *      edges: [
 *        { id: "e_<8-hex>", from: "<src>", to: "<dst>", type: "workspace_dependency" },
 *        ...
 *      ]
 *    }
 *
 *  Determinism rules (binding):
 *
 *  - Both `nodes[]` and `edges[]` are sorted by `id` ascending.
 *  - `edge.id = "e_" + sha256(`${from}|${to}|${type}`).slice(0, 8)`.
 *  - `graphSurfaceHash` is sha256 of the JSON.stringify of the
 *    sorted-by-id node and edge canonical arrays, concatenated.
 *  - No wall-clock fields, no random fields, no absolute paths.
 *  - Re-running on the same `adjacencyMap` produces byte-identical
 *    output (this is the foundation of v1.2 baseline drift).
 *
 *  This module is purely deterministic. It takes a workspace
 *  adjacency map and returns a `CanonicalTopology` object — no
 *  filesystem, no network, no environment access. Tests use it
 *  directly without spawning a CLI process.
 */

import * as crypto from 'node:crypto';

/**
 * Locked at 1.0.0 in v1.2.0. Future v1.x may bump to 1.1.0 when
 * the canonical surface adds optional fields (e.g. node `domain`).
 */
export const CANONICAL_GRAPH_SURFACE_VERSION = '1.0.0';

/**
 * Default edge type emitted by the v1.x workspace adapter.
 * Mirrors the value used in `check.ts`'s violation shape.
 */
export const DEFAULT_EDGE_TYPE = 'workspace_dependency';

export interface CanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

export interface CanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

export interface CanonicalTopology {
  readonly graphSurfaceVersion: string;
  readonly graphSurfaceHash: string;
  readonly nodes: ReadonlyArray<CanonicalNode>;
  readonly edges: ReadonlyArray<CanonicalEdge>;
}

/**
 * Build a canonical topology from a workspace adjacency map.
 *
 * The map shape mirrors what `runner-bridge.executeRunnerBridge`
 * emits in `bridge.adjacencyMap`: `Record<src, target[]>`.
 *
 * Each unique source or target string becomes a node. Each
 * (src, target) pair becomes an edge with type `workspace_dependency`.
 */
export function buildCanonicalTopologyFromAdjacencyMap(
  adjacencyMap: Record<string, ReadonlyArray<string>>,
): CanonicalTopology {
  const nodeIds = new Set<string>();
  const rawEdges: Array<{ from: string; to: string; type: string }> = [];

  for (const [src, targets] of Object.entries(adjacencyMap ?? {})) {
    if (typeof src !== 'string' || src.length === 0) continue;
    nodeIds.add(src);
    for (const t of targets ?? []) {
      if (typeof t !== 'string' || t.length === 0) continue;
      nodeIds.add(t);
      rawEdges.push({ from: src, to: t, type: DEFAULT_EDGE_TYPE });
    }
  }

  return buildCanonicalTopology(
    [...nodeIds],
    rawEdges,
  );
}

/**
 * Build a canonical topology from explicit node and edge lists.
 * Used by tests and by future adapters that emit richer edge data.
 *
 * The function assumes nothing about input ordering; it sorts and
 * de-duplicates internally to enforce the determinism contract.
 */
export function buildCanonicalTopology(
  nodeIds: ReadonlyArray<string>,
  edges: ReadonlyArray<{ from: string; to: string; type?: string }>,
): CanonicalTopology {
  // ── Build nodes ────────────────────────────────────────────
  const uniqueNodeIds = [...new Set(nodeIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  uniqueNodeIds.sort();

  const canonicalNodes: CanonicalNode[] = uniqueNodeIds.map((id) => ({
    id,
    type: 'package' as const,
  }));

  // ── Build edges with deterministic ids ─────────────────────
  const seenEdgeIds = new Set<string>();
  const canonicalEdges: CanonicalEdge[] = [];

  for (const edge of edges) {
    if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string') continue;
    if (edge.from.length === 0 || edge.to.length === 0) continue;
    const type = (edge.type && edge.type.length > 0) ? edge.type : DEFAULT_EDGE_TYPE;
    const id = edgeId(edge.from, edge.to, type);
    if (seenEdgeIds.has(id)) continue; // de-dupe duplicates
    seenEdgeIds.add(id);
    canonicalEdges.push({ id, from: edge.from, to: edge.to, type });
  }

  // ── Stable sort by id ──────────────────────────────────────
  canonicalEdges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // ── Compute graph surface hash ─────────────────────────────
  const graphSurfaceHash = computeGraphSurfaceHash(canonicalNodes, canonicalEdges);

  return {
    graphSurfaceVersion: CANONICAL_GRAPH_SURFACE_VERSION,
    graphSurfaceHash,
    nodes: canonicalNodes,
    edges: canonicalEdges,
  };
}

/**
 * Deterministic edge ID: `"e_" + sha256(from|to|type)[0..8]`.
 *
 * The 8-character hex truncation matches the v1.0.3 violation-id
 * pattern. Collision probability is ~1e-9 for any realistic repo
 * size; acceptable for v1.2.
 */
export function edgeId(from: string, to: string, type: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${from}|${to}|${type}`)
    .digest('hex')
    .slice(0, 8);
  return `e_${hash}`;
}

/**
 * Deterministic hash of the canonical graph surface.
 *
 * Algorithm (locked):
 *   sha256(
 *     JSON.stringify(sortedNodes)
 *     + "\n"
 *     + JSON.stringify(sortedEdges)
 *   )
 *
 * The `\n` separator prevents `nodes=[{id:"a"}], edges=[]` from
 * hashing the same as `nodes=[], edges=[{id:"a"}]` (degenerate
 * edge cases). 64-character hex output, no prefix.
 *
 * Re-runs on the same inputs produce the same hash. Re-orderings
 * are normalised because `buildCanonicalTopology` sorts before
 * hashing.
 */
export function computeGraphSurfaceHash(
  nodes: ReadonlyArray<CanonicalNode>,
  edges: ReadonlyArray<CanonicalEdge>,
): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(nodes))
    .update('\n')
    .update(JSON.stringify(edges))
    .digest('hex');
}

/**
 * Type guard for the canonical topology shape (used by the baseline
 * reader and tests).
 */
export function isCanonicalTopologyShape(value: unknown): value is CanonicalTopology {
  if (value === null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.graphSurfaceVersion !== 'string') return false;
  if (typeof o.graphSurfaceHash !== 'string') return false;
  if (!Array.isArray(o.nodes)) return false;
  if (!Array.isArray(o.edges)) return false;
  // Spot-check the first node/edge if present.
  if (o.nodes.length > 0) {
    const n = o.nodes[0] as Record<string, unknown>;
    if (typeof n?.id !== 'string') return false;
  }
  if (o.edges.length > 0) {
    const e = o.edges[0] as Record<string, unknown>;
    if (typeof e?.id !== 'string' || typeof e?.from !== 'string' || typeof e?.to !== 'string') return false;
  }
  return true;
}
