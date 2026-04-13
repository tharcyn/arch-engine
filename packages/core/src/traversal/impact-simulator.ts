import { MUTATION_WEIGHTING_COEFFICIENTS, isWriteMutation, isReadOnly, isAuthoritySensitive, isMutationEdge } from '../confidence/edge-confidence';

/**
 * ═══════════════════════════════════════════════════════════
 *  Impact Simulator — Phase 6 Pilot
 * ═══════════════════════════════════════════════════════════
 *
 *  Computes strict separated blast-radius scores from a graph trace
 *  while safely navigating authority boundaries.
 *
 *  Uses canonical taxonomy predicates for mutation detection
 *  instead of substring matching. See edge-confidence.ts for
 *  the full mutation vocabulary hierarchy.
 */

export interface ImpactSimulationRequest {
  source_entity: string;
  target_node: string;
  execution_topology: {
    source: string;
    target: string;
    type: string;
  }[];
  authority_boundaries?: Record<string, string[]>;
}

export interface DominantPathDetails {
  source_entity: string;
  traversed_edges: string[];
  mutation_edge_encountered?: string;
  authority_crossing_encountered?: string;
  final_weighted_score_contribution: number;
}

import type { ReasoningProtocolV1 } from '../protocol/reasoning-protocol-v1';

export type ImpactSimulationResponse = ReasoningProtocolV1;

export class ImpactSimulator {
  public simulateImpact(request: ImpactSimulationRequest): ImpactSimulationResponse {
    let structuralScore = request.execution_topology.length;
    let mutationScore = 0;
    let authorityRisk = 0;
    let isConclusive = true;
    let boundaryCrossing: string | undefined;
    let dominantMutationEdge: string | undefined;

    // Strict blind spot stops
    const mappedTypes = request.execution_topology.map(e => e.type);
    if (mappedTypes.includes('unknown') || mappedTypes.includes('unverified')) {
      isConclusive = false;
    }

    const traversedEdges: string[] = [];
    const authorityMap = request.authority_boundaries || {};

    let cumulativePathScore = 0;

    for (const edge of request.execution_topology) {
      traversedEdges.push(edge.type);

      // 1. Evaluate Mutation Weighting using taxonomy predicates
      const weight = MUTATION_WEIGHTING_COEFFICIENTS[edge.type as keyof typeof MUTATION_WEIGHTING_COEFFICIENTS] || 0.5;
      
      if (isWriteMutation(edge.type) || isMutationEdge(edge.type)) {
        mutationScore += weight;
        dominantMutationEdge = edge.type;
      } else if (isReadOnly(edge.type)) {
        mutationScore += weight;
      }

      // 2. Evaluate Authority Boundary Crossing
      // If the target is owned by a service different than the one currently dominating the path
      let isAuthorityOwned = false;
      let ownerService = '';

      for (const [service, bounds] of Object.entries(authorityMap)) {
        if (bounds.includes(edge.target)) {
          isAuthorityOwned = true;
          ownerService = service;
          break;
        }
      }

      if (isAuthorityOwned) {
        // Use taxonomy predicate: only authority-sensitive edge types trigger crossing checks
        if (isAuthoritySensitive(edge.type)) {
          if (edge.source !== ownerService) {
            boundaryCrossing = edge.target;
            authorityRisk = 1.0; 
            mutationScore *= MUTATION_WEIGHTING_COEFFICIENTS.authority_crossing;
          } else {
            // Authorized context path bounds impact gracefully
            authorityRisk = Math.max(authorityRisk, 0.2);
            mutationScore *= MUTATION_WEIGHTING_COEFFICIENTS.same_domain;
          }
        }
      } else if (isAuthoritySensitive(edge.type)) {
        // Secure-By-Uncertainty: Missing authority metadata defaults to maximum boundary risk
        boundaryCrossing = edge.target;
        authorityRisk = 1.0;
        mutationScore *= MUTATION_WEIGHTING_COEFFICIENTS.authority_crossing;
      }

      cumulativePathScore += (weight * (authorityRisk > 0 ? authorityRisk : 1.0));
    }

    // Determine bands based on score scaling
    let structBand: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (structuralScore > 2) structBand = 'MEDIUM';
    if (structuralScore > 5) structBand = 'HIGH';

    let mutBand: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (mutationScore > 2.0 && mutationScore <= 6.0) mutBand = 'MEDIUM';
    if (mutationScore > 6.0) mutBand = 'HIGH';

    // Threshold mapping for the protocol
    let decision: 'PASS' | 'WARNING' | 'BLOCK' = 'PASS';
    if (!isConclusive) {
      if (authorityRisk >= 1.0) decision = 'BLOCK';
      else decision = 'WARNING';
    } else {
      if (authorityRisk >= 1.0) decision = 'BLOCK';
      else if (mutBand === 'HIGH') decision = 'BLOCK';
      else if (mutBand === 'MEDIUM' && structBand === 'HIGH') decision = 'WARNING';
    }

    const missingCaps: string[] = [];
    if (mappedTypes.includes('unverified') || mappedTypes.includes('unknown')) {
       missingCaps.push('surfaceTopology', 'invocationEdges');
    }

    // Output Artifact formatting strictly bound to ReasoningProtocolV1
    return {
      protocol_version: '1.0.0',
      confidence_summary: {
        avg_path_confidence: isConclusive ? 1.0 : 0.5,
        min_path_confidence: isConclusive ? 1.0 : 0.0,
        total_paths_evaluated: request.execution_topology.length,
        conclusive_paths: isConclusive ? request.execution_topology.length : 0,
        inconclusive_paths: isConclusive ? 0 : request.execution_topology.length,
      },
      impact: {
        structural_radius: structBand,
        mutation_radius: mutBand,
        authority_risk_score: authorityRisk,
        conclusive_status: isConclusive,
      },
      dominant_path: {
        source_entity: request.execution_topology.length > 0 ? request.execution_topology[0].source : request.source_entity,
        traversed_edges: traversedEdges,
        mutation_edge_encountered: dominantMutationEdge,
        authority_crossing_encountered: boundaryCrossing,
        final_weighted_score_contribution: Number(cumulativePathScore.toFixed(2))
      },
      missing_capability_layers: missingCaps,
      enforcement_decision: decision
    };
  }
}
