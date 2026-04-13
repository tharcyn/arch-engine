/**
 * ═══════════════════════════════════════════════════════════
 *  Graph Stability Index — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Computes a composite topology reliability score from:
 *    - multi-adapter agreement ratio
 *    - confidence variance
 *    - reconciliation conflict rate
 *    - authority promotion coverage
 *    - confidence-weighted blast radius estimates
 *    - confidence-ranked authority boundary crossings
 *
 *  Consolidates Phase 6 (blast-radius), Phase 7 (authority
 *  crossings), and Phase 9 (stability index) into a single
 *  module emitting unified telemetry.
 *
 *  Forward-portable to: @arch-engine/core/telemetry
 */

import type { ReconciliationTrace } from '../reconciliation/edge-reconciliation';
import type { CanonicalEdgeIndex, EdgeAuthorityLevel } from '../reconciliation/canonical-edge-promoter';
import type { AdapterTrustRegistry } from '../adapters/trust-ranking';
import { computeDistanceAwareConfidence, DEFAULT_DECAY_CONFIG, type TraversalConfidenceDecayConfig } from './confidence-decay';

// ─── Confidence-Weighted Blast Radius ───────────────────

export interface ConfidenceWeightedBlastRadius {
  entity: string;
  entity_id: string;
  /** Original blast radius from adjacency map */
  original_blast_radius: string;
  /** Confidence-weighted blast radius (may be downgraded) */
  weighted_blast_radius: string;
  /** Average confidence of edges reaching this entity */
  average_edge_confidence: number;
  /** Number of entry points reaching this entity */
  reachable_from_count: number;
  /** Consensus ratio: fraction of edges confirmed by multiple adapters */
  consensus_ratio: number;
  /** Distance-decayed confidence (from deepest reachable path) */
  distance_decayed_confidence: number;
  /** Whether radius was attenuated due to low confidence */
  attenuated: boolean;
}

// ─── Authority Crossing Ranking ─────────────────────────

export interface RankedAuthorityCrossing {
  source_entity: string;
  target_entity: string;
  authority_domain: string;
  crossing_type: string;
  route_identity: string;

  /** Edge authority level for this crossing */
  edge_authority_level: EdgeAuthorityLevel;

  /** Confidence score of the crossing edge */
  confidence_score: number;

  /** Trust-weighted confidence (adapter trust × edge confidence) */
  trust_weighted_confidence: number;

  /** Recommended severity based on confidence */
  recommended_severity: 'BLOCKER' | 'CRITICAL' | 'WARNING' | 'INFO';
}

// ─── Stability Index ────────────────────────────────────

export interface GraphStabilityIndex {
  generated_at: string;

  /** Overall topology reliability score (0.0 – 1.0) */
  topology_reliability_score: number;

  /** Component scores contributing to the overall score */
  components: {
    /** Multi-adapter agreement ratio (0 – 1) */
    agreement_ratio: number;

    /** Confidence variance (lower = more stable) */
    confidence_variance: number;

    /** Conflict rate (fraction of edges in conflict) */
    conflict_rate: number;

    /** Authority promotion coverage (fraction of edges with verified+ authority) */
    authority_coverage: number;

    /** Average trust-weighted confidence */
    average_trust_weighted_confidence: number;
  };

  /** Confidence-weighted blast radius analysis */
  blast_radius_analysis: {
    total_entities: number;
    attenuated_entities: number;
    entries: ConfidenceWeightedBlastRadius[];
  };

  /** Confidence-ranked authority crossings */
  authority_crossings: {
    total_crossings: number;
    blocker_crossings: number;
    warning_crossings: number;
    entries: RankedAuthorityCrossing[];
  };

  /** Diagnostic metadata */
  diagnostics: {
    total_edges: number;
    consensus_edges: number;
    heuristic_edges: number;
    low_confidence_edges: number;
    adapters_contributing: string[];
  };
}

// ─── Computation Engine ─────────────────────────────────

/**
 * Compute confidence-weighted blast radii from the adjacency map.
 */
export function computeWeightedBlastRadii(
  adjacencyMap: Record<string, any>,
  canonicalIndex: CanonicalEdgeIndex | null,
  decayConfig: TraversalConfidenceDecayConfig = DEFAULT_DECAY_CONFIG,
): ConfidenceWeightedBlastRadius[] {
  const results: ConfidenceWeightedBlastRadius[] = [];

  for (const [entityKey, node] of Object.entries(adjacencyMap)) {
    const reachableRoutes: string[] = node.reachable_from_routes || [];
    const originalRadius: string = node.blast_radius || 'LOCAL';
    const entityId: string = node.entity_id || '';

    // Gather all edges connecting to this entity from the canonical index
    let avgConfidence = 0.75; // default namespace_inferred
    let consensusRatio = 0;
    let relevantEdgeCount = 0;

    if (canonicalIndex) {
      const relevantEdges = canonicalIndex.edges.filter(
        e => e.target === entityKey || e.source === entityKey,
      );
      relevantEdgeCount = relevantEdges.length;

      if (relevantEdges.length > 0) {
        avgConfidence = relevantEdges.reduce((sum, e) => sum + e.confidence_score, 0) / relevantEdges.length;
        consensusRatio = relevantEdges.filter(e => e.adapter_count > 1).length / relevantEdges.length;
      }
    }

    // Compute actual path depth from entity's dependency chain
    // instead of hardcoding avgDepth = 2 (which made decay constant)
    const depEdgeTypes = [
      'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to',
      'reads_state', 'writes_state', 'creates_state', 'deletes_state',
      'repository_read', 'repository_write', 'cache_read', 'cache_write',
      'external_read', 'external_write',
    ];
    const entityDepCount = depEdgeTypes.reduce(
      (sum, t) => sum + ((node[t] || []).length || 0), 0,
    );
    // Base depth: 1 (route→handler) + dependency fan-out depth heuristic
    // Each dependency edge adds a half-hop (fan-out, not chain depth)
    const avgDepth = reachableRoutes.length > 0
      ? Math.max(1, 1 + Math.floor(Math.log2(Math.max(1, entityDepCount))))
      : 1;
    const decayed = computeDistanceAwareConfidence(avgConfidence, avgDepth, decayConfig);

    // Attenuate blast radius if confidence is low
    let weightedRadius = originalRadius;
    let attenuated = false;
    const RADIUS_ORDER = ['LOCAL', 'SERVICE', 'CROSS_SERVICE', 'PLATFORM', 'SYSTEM_CRITICAL'];

    if (decayed.decayed_confidence < 0.50) {
      const currentIdx = RADIUS_ORDER.indexOf(originalRadius);
      if (currentIdx > 0) {
        weightedRadius = RADIUS_ORDER[Math.max(0, currentIdx - 2)];
        attenuated = true;
      }
    } else if (decayed.decayed_confidence < 0.70) {
      const currentIdx = RADIUS_ORDER.indexOf(originalRadius);
      if (currentIdx > 0) {
        weightedRadius = RADIUS_ORDER[Math.max(0, currentIdx - 1)];
        attenuated = true;
      }
    }

    results.push({
      entity: entityKey,
      entity_id: entityId,
      original_blast_radius: originalRadius,
      weighted_blast_radius: weightedRadius,
      average_edge_confidence: Number(avgConfidence.toFixed(4)),
      reachable_from_count: reachableRoutes.length,
      consensus_ratio: Number(consensusRatio.toFixed(4)),
      distance_decayed_confidence: decayed.decayed_confidence,
      attenuated,
    });
  }

  return results.sort((a, b) => a.entity < b.entity ? -1 : a.entity > b.entity ? 1 : 0);
}

/**
 * Rank authority crossings by confidence.
 */
export function rankAuthorityCrossings(
  crossings: any[],
  canonicalIndex: CanonicalEdgeIndex | null,
  trustRegistry: AdapterTrustRegistry | null,
): RankedAuthorityCrossing[] {
  const results: RankedAuthorityCrossing[] = [];

  for (const crossing of crossings) {
    let confidenceScore = 0.75;
    let authorityLevel: EdgeAuthorityLevel = 'inferred';
    let trustWeight = 0.75;

    if (canonicalIndex) {
      const matchingEdge = canonicalIndex.edges.find(
        e => e.source === crossing.source_entity_id && e.target === crossing.target_entity_id,
      );
      if (matchingEdge) {
        confidenceScore = matchingEdge.confidence_score;
        authorityLevel = matchingEdge.authority_level;
      }
    }

    if (trustRegistry && canonicalIndex) {
      const matchingEdge = canonicalIndex.edges.find(
        e => e.source === crossing.source_entity_id && e.target === crossing.target_entity_id,
      );
      if (matchingEdge && matchingEdge.adapters.length > 0) {
        trustWeight = trustRegistry.getTrustScore(matchingEdge.adapters[0], { edge_type: 'invokes' });
      }
    }

    const trustWeightedConfidence = Number((confidenceScore * trustWeight).toFixed(4));

    // Map confidence to recommended severity
    let recommendedSeverity: 'BLOCKER' | 'CRITICAL' | 'WARNING' | 'INFO';
    if (authorityLevel === 'consensus_verified' || trustWeightedConfidence >= 0.80) {
      recommendedSeverity = 'BLOCKER';
    } else if (authorityLevel === 'verified' || trustWeightedConfidence >= 0.60) {
      recommendedSeverity = 'CRITICAL';
    } else if (trustWeightedConfidence >= 0.40) {
      recommendedSeverity = 'WARNING';
    } else {
      recommendedSeverity = 'INFO';
    }

    results.push({
      source_entity: crossing.source_entity_id || '',
      target_entity: crossing.target_entity_id || '',
      authority_domain: crossing.authority_domain || '',
      crossing_type: crossing.crossing_type || '',
      route_identity: crossing.route_identity || '',
      edge_authority_level: authorityLevel,
      confidence_score: confidenceScore,
      trust_weighted_confidence: trustWeightedConfidence,
      recommended_severity: recommendedSeverity,
    });
  }

  return results.sort((a, b) => b.trust_weighted_confidence - a.trust_weighted_confidence);
}

/**
 * Compute the composite graph stability index.
 */
export function computeGraphStabilityIndex(
  reconciliation: ReconciliationTrace,
  canonicalIndex: CanonicalEdgeIndex | null,
  adjacencyMap: Record<string, any>,
  crossings: any[],
  trustRegistry: AdapterTrustRegistry | null,
  decayConfig: TraversalConfidenceDecayConfig = DEFAULT_DECAY_CONFIG,
): GraphStabilityIndex {
  // Component 1: Agreement ratio (duplicates / total unique edges)
  const agreementRatio = reconciliation.summary.unique_edges > 0
    ? reconciliation.summary.duplicate_edges / reconciliation.summary.unique_edges
    : 0;

  // Component 2: Confidence variance
  const allScores = canonicalIndex
    ? canonicalIndex.edges.map(e => e.confidence_score)
    : [];
  const mean = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;
  const variance = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length
    : 0;

  // Component 3: Conflict rate
  const conflictRate = reconciliation.summary.unique_edges > 0
    ? reconciliation.summary.conflicting_edges / reconciliation.summary.unique_edges
    : 0;

  // Component 4: Authority promotion coverage
  const authorityCoverage = canonicalIndex && canonicalIndex.total_edges > 0
    ? (canonicalIndex.authority_distribution.verified + canonicalIndex.authority_distribution.consensus_verified) /
      canonicalIndex.total_edges
    : 0;

  // Component 5: Average trust-weighted confidence
  let avgTrustWeighted = mean;
  if (trustRegistry && canonicalIndex) {
    const trustWeighted = canonicalIndex.edges.map(e => {
      const trust = e.adapters.length > 0
        ? trustRegistry.getTrustScore(e.adapters[0], { edge_type: e.type })
        : 0.50;
      return e.confidence_score * trust;
    });
    avgTrustWeighted = trustWeighted.length > 0
      ? trustWeighted.reduce((a, b) => a + b, 0) / trustWeighted.length
      : 0;
  }

  // Composite score: weighted average of components
  // Higher agreement and authority = more stable
  // Higher variance and conflict = less stable
  const composite = (
    (agreementRatio * 0.15) +
    ((1 - Math.min(1, variance * 10)) * 0.20) + // Inverted and scaled variance
    ((1 - conflictRate) * 0.20) +
    (authorityCoverage * 0.25) +
    (avgTrustWeighted * 0.20)
  );

  // Blast radius analysis
  const blastRadii = computeWeightedBlastRadii(adjacencyMap, canonicalIndex, decayConfig);

  // Authority crossing ranking
  const rankedCrossings = rankAuthorityCrossings(crossings, canonicalIndex, trustRegistry);

  // Diagnostics
  const lowConfCount = canonicalIndex
    ? canonicalIndex.edges.filter(e => e.confidence_score < 0.60).length
    : 0;
  const heuristicCount = canonicalIndex
    ? canonicalIndex.edges.filter(e => e.authority_level === 'heuristic').length
    : 0;

  return {
    generated_at: 'baseline',
    topology_reliability_score: Number(composite.toFixed(4)),
    components: {
      agreement_ratio: Number(agreementRatio.toFixed(4)),
      confidence_variance: Number(variance.toFixed(4)),
      conflict_rate: Number(conflictRate.toFixed(4)),
      authority_coverage: Number(authorityCoverage.toFixed(4)),
      average_trust_weighted_confidence: Number(avgTrustWeighted.toFixed(4)),
    },
    blast_radius_analysis: {
      total_entities: blastRadii.length,
      attenuated_entities: blastRadii.filter(e => e.attenuated).length,
      entries: blastRadii.filter(e => e.original_blast_radius !== 'LOCAL').slice(0, 100),
    },
    authority_crossings: {
      total_crossings: rankedCrossings.length,
      blocker_crossings: rankedCrossings.filter(c => c.recommended_severity === 'BLOCKER').length,
      warning_crossings: rankedCrossings.filter(c => c.recommended_severity === 'WARNING' || c.recommended_severity === 'INFO').length,
      entries: rankedCrossings,
    },
    diagnostics: {
      total_edges: canonicalIndex?.total_edges ?? 0,
      consensus_edges: canonicalIndex?.authority_distribution.consensus_verified ?? 0,
      heuristic_edges: heuristicCount,
      low_confidence_edges: lowConfCount,
      adapters_contributing: reconciliation.summary.adapters_processed,
    },
  };
}
