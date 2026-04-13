/**
 * ═══════════════════════════════════════════════════════════
 *  Edge Confidence Model — Phase 2.5 Substrate Hardening
 * ═══════════════════════════════════════════════════════════
 *
 *  Introduces explicit confidence classification for graph
 *  edges. All fields are OPTIONAL to preserve backward
 *  compatibility with existing edge structures.
 *
 *  Forward-portable to: @arch-engine/schema
 *
 *  This module is ADDITIVE ONLY — no existing behavior
 *  is modified, no existing fields are removed.
 */

// ─── Confidence Level Taxonomy ──────────────────────────

export type EdgeConfidenceLevel =
  | 'ast_verified'         // Edge confirmed by static analysis (PHPStan, TS compiler)
  | 'runtime_verified'     // Edge confirmed by runtime observation (artisan route:list)
  | 'namespace_inferred'   // Edge inferred from import/namespace analysis
  | 'heuristic'            // Edge guessed from naming convention or proximity
  | 'import_traced'        // Edge traced from explicit javascript import semantics
  | 'contract_verified'    // Edge verified explicitly against cross-boundary contracts
  | 'manual_override';     // Edge declared manually in architecture truth files

// ─── Confidence Score Map ───────────────────────────────

/**
 * Numeric confidence scores for quantitative analysis.
 * Higher = more trustworthy.
 */
export const CONFIDENCE_SCORE_MAP: Record<EdgeConfidenceLevel, number> = {
  ast_verified:       0.95,
  runtime_verified:   0.90,
  namespace_inferred: 0.75,
  import_traced:      0.85,
  contract_verified:  0.92,
  heuristic:          0.50,
  manual_override:    1.00,
};

// ─── Mutation Vocabulary Hierarchy ──────────────────────
//
//  Abstract parent types resolve to concrete subtypes when the
//  adapter can determine the mutation destination. The hierarchy:
//
//    reads_state (abstract)
//    ├─ repository_read
//    ├─ cache_read
//    └─ external_read
//
//    writes_state (abstract fallback — ONLY when substrate is unknown)
//    ├─ repository_write   (concrete: RDBMS)
//    ├─ cache_write         (concrete: Redis/Memcached)
//    └─ external_write      (concrete: 3rd-party API)
//
//    creates_state          (concrete: insertion)
//    deletes_state          (concrete: destruction)
//    dispatches_state_change (bridge: sync→async handoff)
//    eventual_state_change   (deferred: pub/sub propagation)
//    async_state_change      (deferred: queue/job)
//
//  INVARIANT: If a concrete subtype is emitted for a source→target
//  pair, the abstract parent MUST NOT be emitted for the same pair.
//  This prevents double-counting in blast-radius computation.
// ─────────────────────────────────────────────────────────

// ─── Mutation Severity & Traversal Weights ──────────────

/**
 * Propagating a mutation path multiplies its blast radius logic by these coefficients.
 * Higher base weight = worse impact radius across the graph.
 *
 * HIERARCHY RULE: Concrete subtypes carry the full weight.
 * The abstract parent `writes_state` carries a reduced weight
 * because it represents an unresolved substrate — blast-radius
 * computation should be conservative but not inflated.
 */
export const MUTATION_WEIGHTING_COEFFICIENTS = {
  // Abstract parent types (fallback when substrate is unresolvable)
  writes_state: 1.5,       // Abstract: substrate unknown
  reads_state: 0.1,        // Abstract: substrate unknown read

  // Concrete write subtypes (carry full authority weight)
  repository_write: 5.0,   // RDBMS persistent write
  cache_write: 1.1,        // Volatile KV store write
  external_write: 5.0,     // 3rd-party API write

  // Concrete read subtypes
  repository_read: 0.1,    // RDBMS read
  cache_read: 0.05,        // KV read (lowest risk)
  external_read: 0.2,      // 3rd-party API read (rate limiting risk)

  // Concrete mutation types
  creates_state: 1.5,      // Insertion — idempotent risk
  deletes_state: 2.0,      // Destruction — irreversible risk

  // Async/deferred mutation types
  dispatches_state_change: 1.0,  // Sync→async bridge point
  eventual_state_change: 0.5,    // Pub/sub propagation
  async_state_change: 0.5,       // Queue/job deferred

  // Execution Context
  direct: 1.5,
  async: 0.5,              // Eventual consistency bounds impact
  eventual: 0.5,

  // Confidence Adjusters
  verified: 1.0,
  inferred: 0.5,           // Inflating blast-radius on a guess is dangerous

  // Authority Penalties
  authority_crossing: 5.0, // Crossing bounded contexts spikes danger aggressively
  same_domain: 1.0,
};

// ─── Mutation Taxonomy Predicates ───────────────────────
//
//  Use these instead of substring matching (e.g. edge.type.includes('write'))
//  to classify edge behavior in traversal, enforcement, and simulation.
// ─────────────────────────────────────────────────────────

/** All edge types that represent a state write (abstract or concrete) */
const WRITE_MUTATION_TYPES = new Set([
  'writes_state', 'repository_write', 'cache_write', 'external_write',
  'creates_state', 'deletes_state',
]);

/** All edge types that represent an async/deferred mutation */
const ASYNC_MUTATION_TYPES = new Set([
  'dispatches_state_change', 'eventual_state_change', 'async_state_change',
]);

/** All edge types that represent any kind of mutation (write, create, delete, async) */
const ALL_MUTATION_TYPES = new Set([
  ...WRITE_MUTATION_TYPES, ...ASYNC_MUTATION_TYPES,
]);

/** All edge types that represent a read (abstract or concrete) */
const READ_TYPES = new Set([
  'reads_state', 'repository_read', 'cache_read', 'external_read',
]);

/** Concrete write subtypes — if emitted, suppress abstract parent */
const CONCRETE_WRITE_SUBTYPES = new Set([
  'repository_write', 'cache_write', 'external_write',
]);

/** Concrete read subtypes */
const CONCRETE_READ_SUBTYPES = new Set([
  'repository_read', 'cache_read', 'external_read',
]);

/** Edge types that trigger authority crossing checks */
const AUTHORITY_SENSITIVE_TYPES = new Set([
  'writes_state', 'repository_write', 'cache_write', 'external_write',
  'creates_state', 'deletes_state',
]);

/** Is this edge type a write mutation (abstract or concrete)? */
export function isWriteMutation(edgeType: string): boolean {
  return WRITE_MUTATION_TYPES.has(edgeType);
}

/** Is this edge type an async/deferred mutation? */
export function isAsyncMutation(edgeType: string): boolean {
  return ASYNC_MUTATION_TYPES.has(edgeType);
}

/** Is this edge type any kind of mutation? */
export function isMutationEdge(edgeType: string): boolean {
  return ALL_MUTATION_TYPES.has(edgeType);
}

/** Is this edge type a read-only operation? */
export function isReadOnly(edgeType: string): boolean {
  return READ_TYPES.has(edgeType);
}

/** Does this edge type trigger authority crossing enforcement? */
export function isAuthoritySensitive(edgeType: string): boolean {
  return AUTHORITY_SENSITIVE_TYPES.has(edgeType);
}

/** Is this a concrete mutation subtype (not the abstract parent)? */
export function isConcreteMutationSubtype(edgeType: string): boolean {
  return CONCRETE_WRITE_SUBTYPES.has(edgeType) || CONCRETE_READ_SUBTYPES.has(edgeType);
}

// ─── Extended Edge Structure ────────────────────────────

/**
 * Confidence metadata that can be attached to any edge.
 * All fields are optional to preserve backward compatibility.
 */
export interface EdgeConfidenceMetadata {
  /** Classification of how the edge was determined */
  confidence?: EdgeConfidenceLevel;

  /** Numeric confidence score (0.0 – 1.0) */
  confidence_score?: number;

  /** Which adapter/scanner produced this edge */
  confidence_source?: string;
}

// ─── Confidence Classification Functions ────────────────

/**
 * Default scanner category mappings.
 * Consumers can extend this with their own scanner→confidence mappings.
 */
export const DEFAULT_SCANNER_CATEGORIES: Record<string, EdgeConfidenceLevel> = {};

/**
 * Classify the confidence level for a dependency edge based
 * on how the scanner detected it.
 *
 * Classification priority:
 *   1. Structured resolution provenance (dep.resolution)
 *   2. Scanner category mapping (configurable)
 *   3. Default: namespace_inferred
 *
 * @param dep            The dependency object from a scanner
 * @param scanner        The scanner identifier that produced the edge
 * @param scannerMap     Optional scanner→confidence overrides
 * @returns              EdgeConfidenceMetadata for the edge
 */
export function classifyEdgeConfidence(
  dep: { type?: string; name?: string; resolution?: string },
  scanner: string,
  scannerMap: Record<string, EdgeConfidenceLevel> = DEFAULT_SCANNER_CATEGORIES,
): EdgeConfidenceMetadata {
  // 1. Structured resolution provenance (scanner-agnostic)
  if (dep.resolution === 'use_import' || dep.resolution === 'fqcn_literal') {
    return {
      confidence: 'ast_verified',
      confidence_score: CONFIDENCE_SCORE_MAP.ast_verified,
      confidence_source: scanner,
    };
  }

  // 2. Scanner category mapping (consumer-configurable)
  const mapped = scannerMap[scanner];
  if (mapped) {
    return {
      confidence: mapped,
      confidence_score: CONFIDENCE_SCORE_MAP[mapped],
      confidence_source: scanner,
    };
  }

  // 3. Default: namespace inference for unrecognized scanners
  return {
    confidence: 'namespace_inferred',
    confidence_score: CONFIDENCE_SCORE_MAP.namespace_inferred,
    confidence_source: scanner,
  };
}

/**
 * Get the numeric score for a given confidence level.
 * Returns the default (namespace_inferred) score for unknown levels.
 */
export function getConfidenceScore(level?: EdgeConfidenceLevel): number {
  if (!level) return CONFIDENCE_SCORE_MAP.namespace_inferred;
  return CONFIDENCE_SCORE_MAP[level] ?? CONFIDENCE_SCORE_MAP.namespace_inferred;
}

/**
 * Compare two edges and return the one with higher confidence.
 */
export function higherConfidence(
  a: EdgeConfidenceMetadata,
  b: EdgeConfidenceMetadata,
): EdgeConfidenceMetadata {
  const scoreA = a.confidence_score ?? getConfidenceScore(a.confidence);
  const scoreB = b.confidence_score ?? getConfidenceScore(b.confidence);
  return scoreA >= scoreB ? a : b;
}
