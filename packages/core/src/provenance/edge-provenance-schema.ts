/**
 * ═══════════════════════════════════════════════════════════
 *  Edge Provenance Normalization Schema — Phase 2.7
 * ═══════════════════════════════════════════════════════════
 *
 *  Canonical provenance record for every edge in the graph.
 *  Normalizes scattered metadata into a single schema:
 *    confidence, source, authority, trust, reconciliation
 *
 *  Properties:
 *    - deterministic
 *    - serializable (JSON-safe)
 *    - adapter-neutral
 *    - extraction-safe
 *
 *  Forward-portable to: @arch-engine/schema
 */

import type { EdgeConfidenceLevel } from '../confidence/edge-confidence';
import type { EdgeAuthorityLevel } from '../reconciliation/canonical-edge-promoter';

// Proprietary imports removed to enforce pure core abstraction boundary.

// ─── Classification Strategy ────────────────────────────

export type ClassificationStrategy =
  | 'import_resolution'     // Edge classified from use/import statement analysis
  | 'reflection_scan'       // Edge classified from runtime reflection
  | 'constructor_injection' // Edge classified from constructor DI analysis
  | 'method_call_analysis'  // Edge classified from method call tracing
  | 'event_registration'    // Edge classified from event/listener registration
  | 'route_registration'    // Edge classified from route registration
  | 'manual_declaration'    // Edge declared in architecture truth files
  | 'naming_convention'     // Edge inferred from naming patterns
  | 'unknown';              // Classification strategy not determinable

// ─── Reconciliation Strategy ────────────────────────────

export type ReconciliationStrategy =
  | 'none'                  // Single-source edge, no reconciliation needed
  | 'higher_confidence'     // Resolved by choosing highest confidence
  | 'adapter_priority'      // Resolved by adapter trust ranking
  | 'consensus_verified'    // Confirmed by multi-adapter consensus
  | 'conflict_unresolved';  // Conflict detected but not yet resolved

// ─── Canonical Provenance Record ────────────────────────

export interface EdgeProvenanceRecord {
  /** Adapter that originated this edge */
  origin_adapter: string;

  /** How confident we are in this edge */
  confidence_level: EdgeConfidenceLevel;

  /** Numeric confidence score */
  confidence_score: number;

  /** Authority level of this edge */
  authority_level: EdgeAuthorityLevel;

  /** List of adapters that confirmed this edge (for consensus edges) */
  consensus_participants: string[];

  /** Trust weight of the originating adapter (from trust registry) */
  trust_weight: number;

  /** How the edge was classified */
  classification_strategy: ClassificationStrategy;

  /** How conflicts were resolved (if any) */
  reconciliation_strategy: ReconciliationStrategy;

  /** Whether this edge was promoted by the canonical promoter */
  promotion_status: boolean;
}

// ─── Provenance Builder ─────────────────────────────────

/**
 * Build a provenance record from disparate metadata sources.
 * This normalizes the scattered confidence/authority/trust
 * metadata into a single canonical record.
 */
export function buildProvenanceRecord(params: {
  origin_adapter: string;
  confidence_level?: EdgeConfidenceLevel;
  confidence_score?: number;
  authority_level?: EdgeAuthorityLevel;
  consensus_participants?: string[];
  trust_weight?: number;
  classification_strategy?: ClassificationStrategy;
  reconciliation_strategy?: ReconciliationStrategy;
  promotion_status?: boolean;
}): EdgeProvenanceRecord {
  return {
    origin_adapter: params.origin_adapter,
    confidence_level: params.confidence_level ?? 'namespace_inferred',
    confidence_score: params.confidence_score ?? 0.75,
    authority_level: params.authority_level ?? 'inferred',
    consensus_participants: params.consensus_participants ?? [],
    trust_weight: params.trust_weight ?? 0.75,
    classification_strategy: params.classification_strategy ?? 'unknown',
    reconciliation_strategy: params.reconciliation_strategy ?? 'none',
    promotion_status: params.promotion_status ?? false,
  };
}

/**
 * Infer classification strategy from adapter ID and edge type.
 */
export function inferClassificationStrategy(
  adapterId: string,
  edgeType: string,
): ClassificationStrategy {
  // Controller scanner uses import resolution + method call analysis
  if (adapterId === 'php_controller_deps_scanner') {
    return edgeType === 'invokes' ? 'method_call_analysis' : 'import_resolution';
  }

  // Service scanner uses constructor injection
  if (adapterId === 'php_service_deps_scanner') {
    return 'constructor_injection';
  }

  // Model scanner uses reflection
  if (adapterId === 'php_model_deps_scanner') {
    return 'reflection_scan';
  }

  // Event scanner uses event registration
  if (adapterId === 'php_event_deps_scanner') {
    return 'event_registration';
  }

  // Route scanner uses route registration
  if (adapterId === 'php_route_scanner') {
    return 'route_registration';
  }

  // Declared truth uses manual declaration
  if (adapterId === 'manual_declared_truth') {
    return 'manual_declaration';
  }

  // Frontend scanner uses naming conventions
  if (adapterId === 'ts_frontend_scanner' || adapterId === 'frontend_consumers_adapter') {
    return 'naming_convention';
  }

  // Invocation edges uses explicit import resolution across components
  if (adapterId === 'invocation_edges_adapter') {
    return 'import_resolution';
  }

  return 'unknown';
}

// ─── Provenance Index ───────────────────────────────────

export interface ProvenanceIndex {
  generated_at: string;
  total_edges: number;

  /** Distribution of classification strategies */
  strategy_distribution: Record<ClassificationStrategy, number>;

  /** Distribution of reconciliation strategies */
  reconciliation_distribution: Record<ReconciliationStrategy, number>;

  /** Provenance records keyed by edge key */
  edges: Record<string, EdgeProvenanceRecord>;
}

/**
 * Build a complete provenance index from canonical edges and trust data.
 */
export function buildProvenanceIndex(
  canonicalEdges: Array<{
    edge_key: string;
    source: string;
    target: string;
    type: string;
    confidence_score: number;
    authority_level: string;
    adapters: string[];
    promoted: boolean;
  }>,
  trustScores: Record<string, number>,
): ProvenanceIndex {
  const edges: Record<string, EdgeProvenanceRecord> = {};

  const stratDist: Record<ClassificationStrategy, number> = {
    import_resolution: 0,
    reflection_scan: 0,
    constructor_injection: 0,
    method_call_analysis: 0,
    event_registration: 0,
    route_registration: 0,
    manual_declaration: 0,
    naming_convention: 0,
    unknown: 0,
  };

  const reconDist: Record<ReconciliationStrategy, number> = {
    none: 0,
    higher_confidence: 0,
    adapter_priority: 0,
    consensus_verified: 0,
    conflict_unresolved: 0,
  };

  for (const edge of canonicalEdges) {
    const primaryAdapter = edge.adapters[0] || 'unknown';
    const classStrat = inferClassificationStrategy(primaryAdapter, edge.type);
    const reconStrat: ReconciliationStrategy = edge.adapters.length > 1
      ? (edge.promoted ? 'consensus_verified' : 'higher_confidence')
      : 'none';

    const record = buildProvenanceRecord({
      origin_adapter: primaryAdapter,
      confidence_level: 'namespace_inferred', // Will be enriched when scanners emit provenance
      confidence_score: edge.confidence_score,
      authority_level: edge.authority_level as EdgeAuthorityLevel,
      consensus_participants: edge.adapters.length > 1 ? edge.adapters : [],
      trust_weight: trustScores[primaryAdapter] ?? 0.75,
      classification_strategy: classStrat,
      reconciliation_strategy: reconStrat,
      promotion_status: edge.promoted,
    });

    edges[edge.edge_key] = record;
    stratDist[classStrat]++;
    reconDist[reconStrat]++;
  }

  return {
    generated_at: 'baseline',
    total_edges: canonicalEdges.length,
    strategy_distribution: stratDist,
    reconciliation_distribution: reconDist,
    edges,
  };
}
