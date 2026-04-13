/**
 * ═══════════════════════════════════════════════════════════
 *  Canonical Edge Promoter — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Promotes consensus-confirmed edges to canonical authority
 *  status. Does NOT mutate original edges — stores promotion
 *  metadata in a separate canonical-edge-index.json.
 *
 *  Authority hierarchy:
 *    heuristic → inferred → verified → consensus_verified
 *
 *  Promotion rule:
 *    edge confirmed by N adapters AND confidence >= threshold
 *    → promote authority level
 *
 *  Forward-portable to: @arch-engine/core/reconciliation
 */

import type { BoostedEdge } from './consensus-boost';
import type { ReconcilableEdge, ReconciliationTrace } from './edge-reconciliation';
import { getConfidenceScore, type EdgeConfidenceLevel } from '../confidence/edge-confidence';

// ─── Authority Level ────────────────────────────────────

export type EdgeAuthorityLevel =
  | 'heuristic'           // Lowest: single adapter, heuristic classification
  | 'inferred'            // Single adapter, namespace/import inference
  | 'verified'            // Single adapter, AST or runtime verification
  | 'consensus_verified'; // Multiple adapters agree on this edge

const AUTHORITY_ORDER: EdgeAuthorityLevel[] = [
  'heuristic', 'inferred', 'verified', 'consensus_verified',
];

// ─── Promotion Config ───────────────────────────────────

export interface EdgePromotionConfig {
  /** Minimum adapters for consensus_verified promotion */
  minAdaptersForConsensus: number;

  /** Minimum confidence score for promotion eligibility */
  minConfidenceForPromotion: number;

  /** Mapping from confidence level to base authority level */
  confidenceToAuthority: Record<EdgeConfidenceLevel, EdgeAuthorityLevel>;
}

export const DEFAULT_PROMOTION_CONFIG: EdgePromotionConfig = {
  minAdaptersForConsensus: 2,
  minConfidenceForPromotion: 0.70,
  confidenceToAuthority: {
    heuristic: 'heuristic',
    namespace_inferred: 'inferred',
    import_traced: 'verified',
    contract_verified: 'verified',
    ast_verified: 'verified',
    runtime_verified: 'verified',
    manual_override: 'verified',
  },
};

// ─── Canonical Edge Entry ───────────────────────────────

export interface CanonicalEdgeEntry {
  edge_key: string;
  source: string;
  target: string;
  type: string;

  /** Promoted authority level */
  authority_level: EdgeAuthorityLevel;

  /** Base authority level before promotion */
  base_authority_level: EdgeAuthorityLevel;

  /** Was this edge promoted from a lower authority? */
  promoted: boolean;

  /** Confidence score at time of promotion */
  confidence_score: number;

  /** Number of adapters confirming this edge */
  adapter_count: number;

  /** Adapters that produced/confirmed this edge */
  adapters: string[];

  /** Promotion reason */
  promotion_reason: string;
}

// ─── Canonical Edge Index ───────────────────────────────

export interface CanonicalEdgeIndex {
  generated_at: string;
  total_edges: number;
  promoted_edges: number;
  authority_distribution: Record<EdgeAuthorityLevel, number>;
  edges: CanonicalEdgeEntry[];
}

// ─── Promotion Engine ───────────────────────────────────

/**
 * Determine base authority level for a single-source edge.
 */
function getBaseAuthority(
  confidence: EdgeConfidenceLevel | undefined,
  config: EdgePromotionConfig,
): EdgeAuthorityLevel {
  if (!confidence) return 'inferred';
  return config.confidenceToAuthority[confidence] ?? 'inferred';
}

/**
 * Promote edges to canonical authority status.
 *
 * This function:
 * 1. Evaluates all edges from the reconciliation trace
 * 2. Assigns base authority levels from confidence
 * 3. Promotes consensus-confirmed edges to consensus_verified
 *
 * Does NOT mutate original edge data. Returns a separate index.
 *
 * @param reconciliation  The reconciliation trace from edge-reconciliation
 * @param boostedEdges    Boosted edges from consensus-boost (optional)
 * @param allEdges        All edges from all adapters (for single-source edges)
 * @param config          Promotion configuration
 */
export function promoteEdges(
  reconciliation: ReconciliationTrace,
  boostedEdges: BoostedEdge[],
  allEdges: Record<string, ReconcilableEdge[]>,
  config: EdgePromotionConfig = DEFAULT_PROMOTION_CONFIG,
): CanonicalEdgeIndex {
  const entries: CanonicalEdgeEntry[] = [];
  const seenKeys = new Set<string>();

  // Phase 1: Promote consensus-confirmed edges (duplicates from reconciliation)
  for (const dup of reconciliation.duplicates) {
    seenKeys.add(dup.edge_key);

    const baseAuthority = getBaseAuthority(
      undefined, // duplicates don't carry a single confidence level
      config,
    );

    const meetsConsensus =
      dup.adapter_count >= config.minAdaptersForConsensus &&
      dup.merged_confidence >= config.minConfidenceForPromotion;

    const boosted = boostedEdges.find(b => b.edge_key === dup.edge_key);
    const score = boosted?.boosted_confidence ?? dup.merged_confidence;

    entries.push({
      edge_key: dup.edge_key,
      source: dup.source,
      target: dup.target,
      type: dup.type,
      authority_level: meetsConsensus ? 'consensus_verified' : 'verified',
      base_authority_level: 'verified',
      promoted: meetsConsensus,
      confidence_score: score,
      adapter_count: dup.adapter_count,
      adapters: dup.adapters,
      promotion_reason: meetsConsensus
        ? `${dup.adapter_count} adapters confirm with score ${score} >= ${config.minConfidenceForPromotion}`
        : `multi-adapter but below promotion threshold`,
    });
  }

  // Phase 2: Classify single-source edges (all non-duplicate edges)
  for (const [adapterId, edges] of Object.entries(allEdges)) {
    for (const edge of edges) {
      const key = `${edge.source}→${edge.target}::${edge.type}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const baseAuthority = getBaseAuthority(edge.confidence, config);
      const score = edge.confidence_score ?? getConfidenceScore(edge.confidence);

      entries.push({
        edge_key: key,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        authority_level: baseAuthority,
        base_authority_level: baseAuthority,
        promoted: false,
        confidence_score: score,
        adapter_count: 1,
        adapters: [adapterId],
        promotion_reason: `single-source: ${edge.confidence ?? 'namespace_inferred'}`,
      });
    }
  }

  // Sort for determinism
  entries.sort((a, b) => a.edge_key < b.edge_key ? -1 : a.edge_key > b.edge_key ? 1 : 0);

  // Compute authority distribution
  const distribution: Record<EdgeAuthorityLevel, number> = {
    heuristic: 0,
    inferred: 0,
    verified: 0,
    consensus_verified: 0,
  };
  for (const e of entries) {
    distribution[e.authority_level]++;
  }

  return {
    generated_at: 'baseline',
    total_edges: entries.length,
    promoted_edges: entries.filter(e => e.promoted).length,
    authority_distribution: distribution,
    edges: entries,
  };
}
