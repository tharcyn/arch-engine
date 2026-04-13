/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Trust Ranking Strategy — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Introduces a trust hierarchy for adapters. When edges
 *  conflict, the adapter with the higher trust score wins.
 *
 *  Trust ranking influences:
 *    - edge reconciliation (conflict resolution)
 *    - consensus promotion (weighting)
 *    - confidence aggregation
 *    - authority promotion
 *
 *  Supports project-level, pack-level, and edge-type overrides.
 *
 *  Forward-portable to: @arch-engine/core/reconciliation
 */

// ─── Types ──────────────────────────────────────────────



export interface AdapterTrustScore {
  adapter_id: string;

  /** Base trust score (0.0 – 1.0). Higher = more trusted. */
  base_trust: number;

  /** Trust category for human readability */
  category: 'ast' | 'reflection' | 'runtime' | 'heuristic' | 'manual' | 'spec';

  /** Description of why this trust level is assigned */
  rationale: string;
}

export interface EdgeTypeTrustOverride {
  /** Edge type this override applies to */
  edge_type: string;

  /** Adapter trust scores for this specific edge type */
  adapter_scores: Record<string, number>;
}

export interface TrustRankingConfig {
  /** Base trust scores for all adapters */
  adapter_scores: AdapterTrustScore[];

  /** Per-edge-type trust overrides */
  edge_type_overrides: EdgeTypeTrustOverride[];

  /** Per-pack trust overrides (pack_id → adapter_id → score) */
  pack_overrides: Record<string, Record<string, number>>;

  /** Project-level trust overrides (adapter_id → score) */
  project_overrides: Record<string, number>;
}

// ─── Default Trust Rankings ─────────────────────────────

export const DEFAULT_ADAPTER_TRUST: AdapterTrustScore[] = [];

export const DEFAULT_EDGE_TYPE_OVERRIDES: EdgeTypeTrustOverride[] = [];

export const DEFAULT_TRUST_CONFIG: TrustRankingConfig = {
  adapter_scores: DEFAULT_ADAPTER_TRUST,
  edge_type_overrides: DEFAULT_EDGE_TYPE_OVERRIDES,
  pack_overrides: {},
  project_overrides: {},
};

// ─── Trust Registry ─────────────────────────────────────

export class AdapterTrustRegistry {
  private config: TrustRankingConfig;

  constructor(config: TrustRankingConfig = DEFAULT_TRUST_CONFIG) {
    this.config = config;
  }

  /**
   * Get effective trust score for an adapter.
   *
   * Resolution order:
   *  1. Project-level override
   *  2. Pack-level override (if pack context provided)
   *  3. Edge-type override (if edge type provided)
   *  4. Base trust score
   *  5. Default 0.50
   */
  getTrustScore(
    adapterId: string,
    context?: { pack_id?: string; edge_type?: string },
  ): number {
    // 1. Project-level override
    if (this.config.project_overrides[adapterId] !== undefined) {
      return this.config.project_overrides[adapterId];
    }

    // 2. Pack-level override
    if (context?.pack_id && this.config.pack_overrides[context.pack_id]?.[adapterId] !== undefined) {
      return this.config.pack_overrides[context.pack_id][adapterId];
    }

    // 3. Edge-type override
    if (context?.edge_type) {
      const override = this.config.edge_type_overrides.find(o => o.edge_type === context.edge_type);
      if (override?.adapter_scores[adapterId] !== undefined) {
        return override.adapter_scores[adapterId];
      }
    }

    // 4. Base trust score
    const base = this.config.adapter_scores.find(s => s.adapter_id === adapterId);
    if (base) return base.base_trust;

    // 5. Default
    return 0.50;
  }

  /**
   * Rank adapters by trust for a given context.
   * Returns array sorted highest trust first.
   */
  rankAdapters(
    adapterIds: string[],
    context?: { pack_id?: string; edge_type?: string },
  ): Array<{ adapter_id: string; trust_score: number }> {
    return adapterIds
      .map(id => ({ adapter_id: id, trust_score: this.getTrustScore(id, context) }))
      .sort((a, b) => b.trust_score - a.trust_score);
  }

  /**
   * Resolve a conflicting edge using trust ranking.
   * Returns the adapter_id that should win.
   */
  resolveConflict(
    adapterIds: string[],
    edgeType: string,
    packId?: string,
  ): { winner: string; trust_score: number; rankings: Array<{ adapter_id: string; trust_score: number }> } {
    const ranked = this.rankAdapters(adapterIds, { pack_id: packId, edge_type: edgeType });
    return {
      winner: ranked[0].adapter_id,
      trust_score: ranked[0].trust_score,
      rankings: ranked,
    };
  }

  /**
   * Export trust registry snapshot for telemetry.
   */
  toSnapshot(): {
    base_scores: Record<string, number>;
    edge_type_overrides: Record<string, Record<string, number>>;
    pack_overrides: Record<string, Record<string, number>>;
    project_overrides: Record<string, number>;
  } {
    const baseScores: Record<string, number> = {};
    for (const s of this.config.adapter_scores) {
      baseScores[s.adapter_id] = s.base_trust;
    }

    const edgeOverrides: Record<string, Record<string, number>> = {};
    for (const o of this.config.edge_type_overrides) {
      edgeOverrides[o.edge_type] = o.adapter_scores;
    }

    return {
      base_scores: baseScores,
      edge_type_overrides: edgeOverrides,
      pack_overrides: this.config.pack_overrides,
      project_overrides: this.config.project_overrides,
    };
  }
}
