/**
 * ═══════════════════════════════════════════════════════════
 *  Consensus Confidence Boost Engine — Phase 2.5
 * ═══════════════════════════════════════════════════════════
 *
 *  Increases confidence scores when edges are confirmed
 *  by multiple independent adapters.
 *
 *  Formula:
 *    boosted_score = base_score + (adapter_count - 1) × multiplier
 *    clamped to [0.0, 1.0]
 *
 *  Forward-portable to: @arch-engine/core/reconciliation
 */

import {
  type EdgeConfidenceLevel,
  getConfidenceScore,
} from '../confidence/edge-confidence';

import type { ReconciliationDuplicate } from './edge-reconciliation';

// ─── Types ──────────────────────────────────────────────

export interface ConsensusBoostConfig {
  /** Per-additional-adapter confidence multiplier */
  multiplier: number;

  /** Minimum number of adapters required to apply boost */
  minAdapters: number;

  /** Maximum boosted confidence (ceiling) */
  maxConfidence: number;
}

export const DEFAULT_BOOST_CONFIG: ConsensusBoostConfig = {
  multiplier: 0.05,
  minAdapters: 2,
  maxConfidence: 1.0,
};

export interface BoostedEdge {
  edge_key: string;
  source: string;
  target: string;
  type: string;

  /** Original (pre-boost) confidence score */
  original_confidence: number;

  /** Boosted confidence score */
  boosted_confidence: number;

  /** Number of adapters confirming this edge */
  adapter_count: number;

  /** Adapters that confirmed this edge */
  confirming_adapters: string[];

  /** Whether boost was applied */
  boost_applied: boolean;

  /** Boost delta */
  boost_delta: number;
}

// ─── Boost Functions ────────────────────────────────────

/**
 * Compute consensus boost for a single edge.
 *
 * @param baseScore    The original confidence score
 * @param adapterCount Number of adapters confirming the edge
 * @param config       Boost configuration
 * @returns            Boosted confidence score, clamped to [0, maxConfidence]
 */
export function computeBoost(
  baseScore: number,
  adapterCount: number,
  config: ConsensusBoostConfig = DEFAULT_BOOST_CONFIG,
): number {
  if (adapterCount < config.minAdapters) {
    return baseScore;
  }

  const boost = (adapterCount - 1) * config.multiplier;
  return Math.min(config.maxConfidence, baseScore + boost);
}

/**
 * Apply consensus boost to all edges that were confirmed
 * by multiple adapters.
 *
 * @param duplicates  Duplicate edges from reconciliation trace
 * @param config      Boost configuration
 * @returns           Array of boosted edge results
 */
export function applyConsensusBoost(
  duplicates: ReconciliationDuplicate[],
  config: ConsensusBoostConfig = DEFAULT_BOOST_CONFIG,
): BoostedEdge[] {
  const results: BoostedEdge[] = [];

  for (const dup of duplicates) {
    const original = dup.merged_confidence;
    const boosted = computeBoost(original, dup.adapter_count, config);
    const applied = boosted !== original;

    results.push({
      edge_key: dup.edge_key,
      source: dup.source,
      target: dup.target,
      type: dup.type,
      original_confidence: original,
      boosted_confidence: Number(boosted.toFixed(4)),
      adapter_count: dup.adapter_count,
      confirming_adapters: dup.adapters,
      boost_applied: applied,
      boost_delta: Number((boosted - original).toFixed(4)),
    });
  }

  return results.sort((a, b) => a.edge_key < b.edge_key ? -1 : a.edge_key > b.edge_key ? 1 : 0);
}
