/**
 * ═══════════════════════════════════════════════════════════
 *  Reasoning Protocol V1 — Stage 7A Identity Freeze
 * ═══════════════════════════════════════════════════════════
 *
 *  Canonical output schema for architecture reasoning traversal
 *  and impact simulation.
 *
 *  Forward-portable to: @arch-engine/core/protocol
 */

export const REASONING_PROTOCOL_VERSION = '1.0.0';

// ─── Impact Level Definitions ───────────────────────────

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type EnforcementDecision = 'PASS' | 'WARNING' | 'BLOCK';

// ─── Semantic Boundary Metadata ─────────────────────────

export interface DominantPathDetails {
  /** The origin entity that was mutated */
  source_entity: string;

  /** Edge chain traversed to reach the target */
  traversed_edges: string[];

  /** The specific edge type that triggered mutation semantics */
  mutation_edge_encountered?: string;

  /** The authority boundaries crossed during traversal */
  authority_crossing_encountered?: string;

  /** Multi-hop dampened confidence score of this specific path */
  final_weighted_score_contribution: number;
}

// ─── Protocol Output Definition ─────────────────────────

/**
 * Output shape produced by the ImpactSimulator when reasoning
 * about a topology traversal.
 */
export interface ReasoningProtocolV1 {
  /** Schema contract version */
  protocol_version: '1.0.0';

  /** Output diagnostic string or unique job ID */
  scenario_id?: string;

  /** Raw confidence metrics */
  confidence_summary: {
    avg_path_confidence: number;
    min_path_confidence: number;
    total_paths_evaluated: number;
    conclusive_paths: number;
    inconclusive_paths: number;
  };

  /** The path that contributed most to the impact score */
  dominant_path?: DominantPathDetails;

  /** Formal architecture impact classification */
  impact: {
    structural_radius: ImpactLevel;
    mutation_radius: ImpactLevel;
    authority_risk_score: number;
    
    /**
     * If false, the engine encountered missing topology coverage
     * (blind spots) and cannot guarantee the impact radius is safe.
     * Secure-by-uncertainty dictates treating non-conclusive paths
     * as BLOCK if they cross authority boundaries.
     */
    conclusive_status: boolean;
  };

  /** Capability gaps that degraded traversal confidence */
  missing_capability_layers: string[];

  /** Recommended governance action */
  enforcement_decision: EnforcementDecision;
}
