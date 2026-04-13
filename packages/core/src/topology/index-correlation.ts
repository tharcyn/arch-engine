/**
 * ═══════════════════════════════════════════════════════════
 *  Coverage ↔ Stability Index Correlation Engine — Phase 2.7
 * ═══════════════════════════════════════════════════════════
 *
 *  Answers: "Which missing adapter capability would improve
 *  topology stability the most?"
 *
 *  Enables evidence-driven adapter prioritization before
 *  extraction.
 *
 *  Forward-portable to: @arch-engine/core/telemetry
 */

import type { CoverageIndex, CoverageLayerScore } from '../adapters/coverage-index';
import type { GraphStabilityIndex } from '../traversal/graph-stability-index';

// ─── Correlation Entry ──────────────────────────────────

export interface CorrelationEntry {
  /** Topology layer name */
  layer: string;

  /** Current coverage score for this layer */
  coverage_score: number;

  /** Estimated stability impact of filling this gap */
  estimated_stability_impact: number;

  /** Whether this layer affects authority coverage (high weight) */
  affects_authority: boolean;

  /** Whether this layer affects agreement ratio (high weight) */
  affects_agreement: boolean;

  /** Priority rank (1 = highest impact gap) */
  priority_rank: number;

  /** Recommended adapter action */
  recommendation: string;
}

// ─── Correlation Report ─────────────────────────────────

export interface IndexCorrelationReport {
  generated_at: string;

  /** Current topology reliability score */
  current_stability: number;

  /** Current overall coverage */
  current_coverage: number;

  /** Estimated max stability achievable by filling all gaps */
  estimated_max_stability: number;

  /** Per-layer correlations, sorted by impact */
  correlations: CorrelationEntry[];

  /** Top 3 actionable recommendations */
  top_recommendations: string[];
}

// ─── Stability Impact Model ─────────────────────────────

/**
 * Stability composite formula weights (from graph-stability-index.ts):
 *   agreement_ratio:         0.15
 *   confidence_variance:     0.20 (inverted)
 *   conflict_rate:           0.20 (inverted)
 *   authority_coverage:      0.25
 *   trust_weighted_conf:     0.20
 *
 * Each coverage layer maps to one or more stability components.
 */

interface StabilityMapping {
  /** Which stability components this coverage layer affects */
  components: Array<{
    component: string;
    weight: number;
    contribution_if_filled: number;
  }>;
  affects_authority: boolean;
  affects_agreement: boolean;
}

const LAYER_STABILITY_MAP: Record<string, StabilityMapping> = {
  surface_topology: {
    components: [
      { component: 'trust_weighted_confidence', weight: 0.20, contribution_if_filled: 0.05 },
    ],
    affects_authority: false,
    affects_agreement: false,
  },
  handler_resolution: {
    components: [
      { component: 'trust_weighted_confidence', weight: 0.20, contribution_if_filled: 0.04 },
      { component: 'confidence_variance', weight: 0.20, contribution_if_filled: 0.02 },
    ],
    affects_authority: false,
    affects_agreement: false,
  },
  invocation_edges: {
    components: [
      { component: 'agreement_ratio', weight: 0.15, contribution_if_filled: 0.08 },
      { component: 'authority_coverage', weight: 0.25, contribution_if_filled: 0.05 },
    ],
    affects_authority: true,
    affects_agreement: true,
  },
  authority_metadata: {
    components: [
      { component: 'authority_coverage', weight: 0.25, contribution_if_filled: 0.18 },
      { component: 'trust_weighted_confidence', weight: 0.20, contribution_if_filled: 0.05 },
    ],
    affects_authority: true,
    affects_agreement: false,
  },
  contract_topology: {
    components: [
      { component: 'agreement_ratio', weight: 0.15, contribution_if_filled: 0.06 },
      { component: 'trust_weighted_confidence', weight: 0.20, contribution_if_filled: 0.04 },
    ],
    affects_authority: false,
    affects_agreement: true,
  },
  event_topology: {
    components: [
      { component: 'agreement_ratio', weight: 0.15, contribution_if_filled: 0.03 },
    ],
    affects_authority: false,
    affects_agreement: true,
  },
  frontend_consumers: {
    components: [
      { component: 'agreement_ratio', weight: 0.15, contribution_if_filled: 0.02 },
    ],
    affects_authority: false,
    affects_agreement: true,
  },
  data_access_edges: {
    components: [
      { component: 'authority_coverage', weight: 0.25, contribution_if_filled: 0.07 },
      { component: 'agreement_ratio', weight: 0.15, contribution_if_filled: 0.04 },
    ],
    affects_authority: true,
    affects_agreement: true,
  },
};

// ─── Correlation Engine ─────────────────────────────────

/**
 * Compute the correlation between coverage gaps and stability impact.
 *
 * @param coverageIndex   Coverage index from Phase 1
 * @param stabilityIndex  Graph stability index from Phase 2.6
 */
export function computeCorrelation(
  coverageIndex: CoverageIndex,
  stabilityIndex: GraphStabilityIndex,
): IndexCorrelationReport {
  const entries: CorrelationEntry[] = [];

  for (const [layerName, layerScore] of Object.entries(coverageIndex.layers)) {
    const mapping = LAYER_STABILITY_MAP[layerName];
    if (!mapping) continue;

    // Estimate impact: sum of (component_contribution × (1 - current_coverage))
    const gap = 1.0 - layerScore.score;
    const estimatedImpact = mapping.components.reduce(
      (sum, comp) => sum + (comp.contribution_if_filled * gap),
      0,
    );

    // Generate recommendation
    let recommendation = '';
    if (gap >= 0.80) {
      recommendation = `CRITICAL GAP: ${layerName} coverage at ${(layerScore.score * 100).toFixed(0)}%. Adding adapter coverage would improve stability by ≈${(estimatedImpact * 100).toFixed(1)}%.`;
    } else if (gap >= 0.30) {
      recommendation = `MODERATE GAP: ${layerName} coverage at ${(layerScore.score * 100).toFixed(0)}%. Enriching adapter data would improve stability by ≈${(estimatedImpact * 100).toFixed(1)}%.`;
    } else {
      recommendation = `ADEQUATE: ${layerName} coverage at ${(layerScore.score * 100).toFixed(0)}%. Minimal stability gain from additional coverage (≈${(estimatedImpact * 100).toFixed(1)}%).`;
    }

    entries.push({
      layer: layerName,
      coverage_score: layerScore.score,
      estimated_stability_impact: Number(estimatedImpact.toFixed(4)),
      affects_authority: mapping.affects_authority,
      affects_agreement: mapping.affects_agreement,
      priority_rank: 0, // Set after sorting
      recommendation,
    });
  }

  // Sort by impact (highest first) and assign priority ranks
  entries.sort((a, b) => b.estimated_stability_impact - a.estimated_stability_impact);
  entries.forEach((e, i) => { e.priority_rank = i + 1; });

  // Estimated max stability = current + sum of all impacts
  const totalPotentialGain = entries.reduce((sum, e) => sum + e.estimated_stability_impact, 0);
  const estimatedMax = Math.min(1.0, stabilityIndex.topology_reliability_score + totalPotentialGain);

  // Top 3 recommendations
  const topRecs = entries
    .filter(e => e.estimated_stability_impact > 0.01)
    .slice(0, 3)
    .map(e => e.recommendation);

  return {
    generated_at: 'baseline',
    current_stability: stabilityIndex.topology_reliability_score,
    current_coverage: coverageIndex.overall_coverage,
    estimated_max_stability: Number(estimatedMax.toFixed(4)),
    correlations: entries,
    top_recommendations: topRecs,
  };
}
