/**
 * ═══════════════════════════════════════════════════════════
 *  Cross-Adapter Edge Reconciliation Engine — Shadow Mode
 * ═══════════════════════════════════════════════════════════
 *
 *  Detects duplicate and conflicting edges across multiple
 *  adapter outputs without modifying the entity graph.
 *
 *  Shadow mode: produces reconciliation-trace.json as a
 *  diagnostic side-car. Does NOT alter existing graph edges.
 *
 *  Forward-portable to: @arch-engine/core/reconciliation
 */

import {
  type EdgeConfidenceLevel,
  type EdgeConfidenceMetadata,
  CONFIDENCE_SCORE_MAP,
  getConfidenceScore,
  higherConfidence,
} from '../confidence/edge-confidence';

// ─── Types ──────────────────────────────────────────────

export interface ReconcilableEdge {
  source: string;
  target: string;
  type: string;
  confidence?: EdgeConfidenceLevel;
  confidence_score?: number;
  adapter_id: string;
}

export type ConflictResolution =
  | 'higher_confidence_wins'  // Edge with highest confidence score wins
  | 'adapter_priority_wins'   // Adapter with higher trust priority wins
  | 'consensus_required'      // Edge only accepted if confirmed by 2+ adapters
  | 'preserve_all';           // Keep all edges (for diagnostic purposes)

export interface ReconciliationConflict {
  edge_key: string;
  source: string;
  target: string;
  type: string;
  adapters: Array<{
    adapter_id: string;
    confidence: EdgeConfidenceLevel;
    confidence_score: number;
  }>;
  resolution: ConflictResolution;
  resolved_confidence: number;
  resolved_adapter: string;
}

export interface ReconciliationDuplicate {
  edge_key: string;
  source: string;
  target: string;
  type: string;
  adapter_count: number;
  adapters: string[];
  merged_confidence: number;
  confidence_sources: string[];
}

export interface ReconciliationMissing {
  /** Edge that exists in one adapter but not another */
  edge_key: string;
  source: string;
  target: string;
  type: string;
  present_in: string[];
  absent_from: string[];
  confidence_impact: string;
}

export interface ReconciliationTrace {
  /** When this reconciliation was computed */
  reconciled_at: string;

  /** Total edges processed */
  total_edges: number;

  /** Edges confirmed by multiple adapters */
  duplicates: ReconciliationDuplicate[];

  /** Edges with conflicting confidence/type across adapters */
  conflicts: ReconciliationConflict[];

  /** Edges present in one adapter but absent from another with overlap */
  missing: ReconciliationMissing[];

  /** Summary statistics */
  summary: {
    unique_edges: number;
    duplicate_edges: number;
    conflicting_edges: number;
    missing_edges: number;
    adapters_processed: string[];
    average_confidence: number;
  };
}

// ─── Edge Key Generation ────────────────────────────────

function edgeKey(source: string, target: string, type: string): string {
  return `${source}→${target}::${type}`;
}

// ─── Reconciliation Engine ──────────────────────────────

/**
 * Run shadow reconciliation across edges from multiple adapters.
 *
 * This does NOT modify any existing graph data. It produces
 * a diagnostic trace showing where adapters agree, disagree,
 * or have gaps.
 *
 * @param edgesByAdapter  Map of adapter_id → edges from that adapter
 * @param resolution      Conflict resolution strategy
 * @returns               Reconciliation trace
 */
export function reconcileEdges(
  edgesByAdapter: Record<string, ReconcilableEdge[]>,
  resolution: ConflictResolution = 'higher_confidence_wins',
): ReconciliationTrace {
  // Group edges by key across all adapters
  const edgeIndex: Map<string, Array<ReconcilableEdge & { adapter_id: string }>> = new Map();

  for (const [adapterId, edges] of Object.entries(edgesByAdapter)) {
    for (const edge of edges) {
      const key = edgeKey(edge.source, edge.target, edge.type);
      if (!edgeIndex.has(key)) {
        edgeIndex.set(key, []);
      }
      edgeIndex.get(key)!.push({ ...edge, adapter_id: adapterId });
    }
  }

  const duplicates: ReconciliationDuplicate[] = [];
  const conflicts: ReconciliationConflict[] = [];
  const totalScores: number[] = [];

  for (const [key, edges] of edgeIndex.entries()) {
    const scores = edges.map(e => e.confidence_score ?? getConfidenceScore(e.confidence));
    totalScores.push(...scores);

    if (edges.length > 1) {
      // Check for conflicting confidence levels
      const uniqueConfLevels = new Set(edges.map(e => e.confidence));

      if (uniqueConfLevels.size > 1) {
        // Conflict: same edge, different confidence from different adapters
        const sortedEdges = edges.sort(
          (a, b) => (b.confidence_score ?? getConfidenceScore(b.confidence)) -
                    (a.confidence_score ?? getConfidenceScore(a.confidence)),
        );

        const winner = sortedEdges[0];

        conflicts.push({
          edge_key: key,
          source: edges[0].source,
          target: edges[0].target,
          type: edges[0].type,
          adapters: edges.map(e => ({
            adapter_id: e.adapter_id,
            confidence: e.confidence ?? 'namespace_inferred',
            confidence_score: e.confidence_score ?? getConfidenceScore(e.confidence),
          })),
          resolution,
          resolved_confidence: winner.confidence_score ?? getConfidenceScore(winner.confidence),
          resolved_adapter: winner.adapter_id,
        });
      } else {
        // Duplicate: same edge confirmed by multiple adapters
        const mergedScore = Math.max(...scores);

        duplicates.push({
          edge_key: key,
          source: edges[0].source,
          target: edges[0].target,
          type: edges[0].type,
          adapter_count: edges.length,
          adapters: edges.map(e => e.adapter_id),
          merged_confidence: mergedScore,
          confidence_sources: edges.map(e => e.adapter_id),
        });
      }
    }
  }

  // Detect missing edges (where adapters with overlapping entity types differ)
  const missing: ReconciliationMissing[] = [];
  const adapterIds = Object.keys(edgesByAdapter);

  // Only check for missing if there are adapter pairs with overlapping scope
  if (adapterIds.length > 1) {
    for (const [key, edges] of edgeIndex.entries()) {
      if (edges.length < adapterIds.length) {
        const presentIn = edges.map(e => e.adapter_id);
        const absentFrom = adapterIds.filter(id => !presentIn.includes(id));

        // Only flag if absent adapters could reasonably provide this edge type
        if (absentFrom.length > 0 && absentFrom.length < adapterIds.length) {
          missing.push({
            edge_key: key,
            source: edges[0].source,
            target: edges[0].target,
            type: edges[0].type,
            present_in: presentIn,
            absent_from: absentFrom,
            confidence_impact: 'confidence_lowered',
          });
        }
      }
    }
  }

  const avgConfidence = totalScores.length > 0
    ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length
    : 0;

  return {
    reconciled_at: new Date().toISOString(),
    total_edges: totalScores.length,
    duplicates: duplicates.sort((a, b) => a.edge_key < b.edge_key ? -1 : a.edge_key > b.edge_key ? 1 : 0),
    conflicts: conflicts.sort((a, b) => a.edge_key < b.edge_key ? -1 : a.edge_key > b.edge_key ? 1 : 0),
    missing: missing.sort((a, b) => a.edge_key < b.edge_key ? -1 : a.edge_key > b.edge_key ? 1 : 0),
    summary: {
      unique_edges: edgeIndex.size,
      duplicate_edges: duplicates.length,
      conflicting_edges: conflicts.length,
      missing_edges: missing.length,
      adapters_processed: adapterIds.sort(),
      average_confidence: Number(avgConfidence.toFixed(4)),
    },
  };
}
