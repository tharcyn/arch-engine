import { AdapterCapabilityRegistry } from '../adapters/capability-registry';
import { AdapterTrustRegistry, TrustRankingConfig, DEFAULT_TRUST_CONFIG } from '../adapters/trust-ranking';
import { EngineManifest } from '../manifest/manifest-loader';
import { AdapterPack, ArchitectureAdapter } from '../sdk/adapter-contract';
import { _installAdapterPack, _freezeAdapterRegistry, type EngineLogger } from '../sdk/adapter-registry-api';

import { reconcileEdges } from '../reconciliation/edge-reconciliation';
import { applyConsensusBoost } from '../reconciliation/consensus-boost';
import { promoteEdges } from '../reconciliation/canonical-edge-promoter';

import { getConfidenceAwareReachability } from '../traversal/confidence-propagation';
import { negotiateCapabilities } from '../adapters/capability-negotiation';
import { enforceCapabilities } from '../adapters/capability-enforcement';

import { computeGraphStabilityIndex } from '../traversal/graph-stability-index';
import { computeCoverageIndex } from '../adapters/coverage-index';
import { buildProvenanceIndex } from '../provenance/edge-provenance-schema';
import { runParityHarness } from '../identity/parity-check';
import { computeCompletenessHeatmap } from '../topology/completeness-heatmap';
import { computeCorrelation } from '../topology/index-correlation';
import { generateAdapterPriorityPlan } from '../adapters/adapter-priority-plan';

// ─── Type imports for result contract ───────────────────
import type { ReconcilableEdge, ReconciliationTrace } from '../reconciliation/edge-reconciliation';
import type { BoostedEdge } from '../reconciliation/consensus-boost';
import type { ConfidenceAwareReachabilityEntry } from '../traversal/confidence-propagation';
import type { NegotiationResult } from '../adapters/capability-negotiation';
import type { CanonicalEdgeIndex } from '../reconciliation/canonical-edge-promoter';
import type { CapabilityEnforcementResult } from '../adapters/capability-enforcement';
import type { GraphStabilityIndex } from '../traversal/graph-stability-index';
import type { CoverageIndex } from '../adapters/coverage-index';
import type { ProvenanceIndex } from '../provenance/edge-provenance-schema';
import type { IdentityParityReport } from '../identity/parity-check';
import type { TopologyCompletenessHeatmap } from '../topology/completeness-heatmap';
import type { IndexCorrelationReport } from '../topology/index-correlation';
import type { AdapterPriorityPlan } from '../adapters/adapter-priority-plan';

// ═══════════════════════════════════════════════════════════
//  Input Contract — Graph Schema Types
// ═══════════════════════════════════════════════════════════

// ─── Blast Radius ───────────────────────────────────────

/** Impact classification for blast-radius analysis */
export type BlastRadius =
  | 'LOCAL'
  | 'SERVICE'
  | 'CROSS_SERVICE'
  | 'PLATFORM'
  | 'SYSTEM_CRITICAL';

// ─── Adjacency Node ─────────────────────────────────────

/**
 * A single node in the entity adjacency graph.
 *
 * The 29 named properties below form the canonical node
 * contract. Any adapter-contributed edge arrays or metadata
 * that fall outside this shape belong in `extensions`.
 *
 * DESIGN LAW: The root-level shape is strict. Custom
 * adapter data goes through `extensions`, never as
 * ad-hoc top-level keys. This prevents unnamed fields
 * from silently polluting the canonical contract.
 */
export interface AdjacencyNode {
  /** Deterministic entity identity hash */
  entity_id: string;

  // ── Mutation topology edges ─────────────
  reads_state: string[];
  writes_state: string[];
  creates_state: string[];
  deletes_state: string[];
  dispatches_state_change: string[];
  eventual_state_change: string[];
  async_state_change: string[];

  // ── Data access edges ───────────────────
  repository_read: string[];
  repository_write: string[];
  cache_read: string[];
  cache_write: string[];
  external_read: string[];
  external_write: string[];

  // ── Dependency edges ────────────────────
  reads_from: string[];
  writes_to: string[];
  invokes: string[];
  emits: string[];
  subscribes_to: string[];

  // ── Contract & surface edges ────────────
  contracts_with: string[];
  consumes: string[];
  exposes: string[];
  uses_layout: string[];
  requires_permission: string[];
  requires_role: string[];
  redirects_to: string[];

  // ── Traversal metadata ──────────────────
  /** Route identity keys this entity is reachable from */
  reachable_from_routes: string[];
  /** Whether this entity is a mutation authority */
  mutation_authority: boolean;
  /** Impact classification for blast-radius analysis */
  blast_radius: BlastRadius;

  // ── Adapter extension namespace ─────────
  /**
   * Adapter-contributed edge arrays or metadata that are
   * not part of the canonical 29-field contract.
   *
   * This keeps the root shape strict while allowing
   * adapters to attach domain-specific data.
   */
  extensions?: Record<string, string[] | string | boolean | undefined>;
}

// ─── Route Service Map ──────────────────────────────────

/**
 * Individual route-to-handler resolution record.
 *
 * Maps a frontend route to its backend handler resolution,
 * including controller identity, reachable services, and
 * OpenAPI operation bindings.
 *
 * @stability stable (evolution-sensitive)
 *
 * @remarks
 * This is the most shape-sensitive public type in the graph
 * schema contract. The index signature (`[key: string]: unknown`)
 * and diagnostic fields (e.g. `controller_resolution_status`)
 * are refinement candidates for future versions.
 *
 * Treat this as the **primary versioning watch point** within
 * the public contract surface. Field additions are minor bumps;
 * field removals or type narrowing are major bumps.
 */
export interface RouteServiceEntry {
  /** Corresponding frontend route (null if backend-only) */
  frontend_route: string | null;
  /** Full backend route identity string */
  backend_route: string;
  /** HTTP method */
  method: string;
  /** Controller short name */
  controller: string;
  /** Fully-qualified controller class name */
  controller_fqcn: string;
  /** Deterministic controller entity identity hash */
  controller_entity_id: string;
  /** Resolution status from handler resolution pass */
  controller_resolution_status: string;
  /** Services reachable from this handler */
  services: string[];
  /** OpenAPI operation IDs mapped to this route */
  operation_ids: string[];
  /** Extension fields from consumer-specific route resolution */
  [key: string]: unknown;
}

/** Bidirectional route-to-handler resolution map */
export interface RouteServiceMap {
  /** Route identity → handler resolution record */
  forward: Record<string, RouteServiceEntry>;
  /** Handler FQCN → route identity keys (reverse lookup) */
  reverse: Record<string, string[]>;
}

// ─── Authority Crossings ────────────────────────────────

/** An authority boundary crossing between two entities */
export interface AuthorityCrossing {
  /** Source entity identity */
  source_entity_id: string;
  /** Target entity identity */
  target_entity_id: string;
  /** Authority domain being crossed */
  authority_domain: string;
  /** Type of crossing (e.g. invocation, data access) */
  crossing_type: string;
  /** Route through which this crossing is reachable */
  route_identity: string;
}

// ─── Entity Sources ─────────────────────────────────────

/**
 * An entity record with enough identity fields for
 * parity verification (hash stability, uniqueness,
 * stored-ID cross-checks).
 *
 * Fields use optional properties because scanner outputs
 * use fallback chains (e.g. `class_name || fqcn`).
 */
export interface IdentifiableEntity {
  /** Primary class/component name */
  class_name?: string;
  /** Fully-qualified class name (fallback for class_name) */
  fqcn?: string;
  /** Source file path */
  file_path?: string;
  /** Entity type classification */
  entity_type?: string;
  /** Pre-computed entity identity hash */
  entity_id?: string;
  /** Scanner-specific extra fields */
  [key: string]: unknown;
}

/** A collection of entities from a single scanner source */
export interface EntitySourceCollection {
  /** Entity records from this scanner */
  entities: IdentifiableEntity[];
  /** Default entity type for this collection (used when entity_type is absent on individual records) */
  entity_type_field?: string;
}

// ═══════════════════════════════════════════════════════════
//  Runner Configuration
// ═══════════════════════════════════════════════════════════

export interface EngineRunnerOptions {
  /** Trust ranking config for adapter conflict resolution */
  trustConfig?: TrustRankingConfig;
  /** Logger function — defaults to no-op. Never console.log. */
  logger?: EngineLogger;
}

// ═══════════════════════════════════════════════════════════
//  Execution Input Contract
// ═══════════════════════════════════════════════════════════

/**
 * The orchestration input for `EngineRunner.executePipeline()`.
 *
 * Each field represents a distinct semantic domain:
 *   - graph:    adjacencyMap, crossings
 *   - routing:  routeServiceMap
 *   - adapters: edgesByAdapter
 *   - identity: entitySources
 *
 * INVARIANT: This interface is a versioned public contract.
 * Adding required fields is a major version bump. Adding
 * optional fields is a minor version bump.
 */
export interface EngineExecutionState {
  /** Entity adjacency graph keyed by entity identity string */
  adjacencyMap: Record<string, AdjacencyNode>;

  /** Bidirectional route-to-handler resolution map */
  routeServiceMap?: RouteServiceMap;

  /** Authority boundary crossings to analyze */
  crossings?: AuthorityCrossing[];

  /** Edges grouped by adapter ID for cross-adapter reconciliation */
  edgesByAdapter: Record<string, ReconcilableEdge[]>;

  /** Scanner output collections for identity parity verification */
  entitySources?: EntitySourceCollection[];
}

// ═══════════════════════════════════════════════════════════
//  Execution Output Contract
// ═══════════════════════════════════════════════════════════

/**
 * The immutable result from `EngineRunner.executePipeline()`.
 *
 * Every field is a snapshot or computed report — never a live
 * reference to engine internals. All types are explicitly
 * declared interfaces, not inferred implementation details.
 *
 * INVARIANT: Removing or renaming a field is a major version
 * bump. Adding a field is a minor version bump.
 */
export interface EngineExecutionResult {
  /** Frozen capability registry snapshot */
  capabilitySnapshot: ReturnType<AdapterCapabilityRegistry['toSnapshot']>;

  /** Frozen trust ranking snapshot */
  trustSnapshot: ReturnType<AdapterTrustRegistry['toSnapshot']>;

  /** Cross-adapter edge reconciliation diagnostic trace */
  reconciliationTrace: ReconciliationTrace;

  /** Consensus-boosted duplicate edges */
  boostedEdges: BoostedEdge[];

  /** Confidence-aware entity reachability from routes */
  reachability: ConfidenceAwareReachabilityEntry[];

  /** Governance gate capability coverage assessment */
  capabilityNegotiation: NegotiationResult;

  /** Canonical promoted edge authority index */
  canonicalIndex: CanonicalEdgeIndex;

  /** Governance pack enforcement results */
  capabilityEnforcement: CapabilityEnforcementResult;

  /** Composite topology reliability score and blast-radius analysis */
  stabilityIndex: GraphStabilityIndex;

  /** Per-layer adapter coverage assessment */
  coverageIndex: CoverageIndex;

  /** Edge provenance attribution index */
  provenanceIndex: ProvenanceIndex;

  /** Cross-language identity parity verification */
  identityParity: IdentityParityReport;

  /** Per-layer topology completeness heatmap */
  heatmap: TopologyCompletenessHeatmap;

  /** Coverage↔stability gap correlation report */
  correlation: IndexCorrelationReport;

  /** Adapter evolution priority plan */
  priorityPlan: AdapterPriorityPlan;
}

// ═══════════════════════════════════════════════════════════
//  Engine Runner — Central Orchestration Authority
// ═══════════════════════════════════════════════════════════
//
//  Owns the full adapter lifecycle and pipeline execution.
//
//  DESIGN LAW: All mutable adapter state is instance-scoped.
//  No module-level singletons. Multiple EngineRunner instances
//  within a single process are safe and independent.
//
//  Lifecycle:
//    1. new EngineRunner(manifest)
//    2. runner.loadAdapterPack(pack)  — repeatable
//    3. runner.executePipeline(state) — freezes, then runs

export class EngineRunner {
  private registry: AdapterCapabilityRegistry;
  private trustRegistry: AdapterTrustRegistry;
  private engineManifest: EngineManifest;
  private activeAdapters: ArchitectureAdapter[] = [];
  private logger: EngineLogger;

  constructor(engineManifest: EngineManifest, options: EngineRunnerOptions = {}) {
    this.engineManifest = engineManifest;
    this.registry = new AdapterCapabilityRegistry();
    this.trustRegistry = new AdapterTrustRegistry(options.trustConfig ?? DEFAULT_TRUST_CONFIG);
    this.logger = options.logger ?? (() => {});
  }

  /**
   * Load an adapter pack into this engine instance.
   * Must be called before executePipeline().
   */
  public async loadAdapterPack(pack: AdapterPack): Promise<void> {
    await _installAdapterPack(
      this.engineManifest,
      this.registry,
      pack,
      this.activeAdapters,
      this.logger
    );
  }

  /**
   * Deterministically evaluate the full reasoning topology pipeline.
   *
   * Freezes the adapter registry, then executes reconciliation,
   * confidence propagation, and topology synthesis in fixed order.
   *
   * Returns immutable snapshots — never live registry references.
   */
  public async executePipeline(state: EngineExecutionState): Promise<EngineExecutionResult> {
    // 1. Lifecycle Lock: Freeze capabilities
    await _freezeAdapterRegistry(this.registry, this.activeAdapters, this.logger);

    // 2. Graph Reconciliation (Shadow Mode)
    const reconciliationTrace = reconcileEdges(state.edgesByAdapter);

    // 3. Consensus & Coverage Validation
    const boostedEdges = applyConsensusBoost(reconciliationTrace.duplicates);
    const reachability = getConfidenceAwareReachability(state.adjacencyMap as Record<string, any>, 'minimum', this.registry);

    // 4. Registry Configuration Lock
    const capabilitySnapshot = this.registry.toSnapshot();
    const capabilityNegotiation = negotiateCapabilities(this.registry);

    // 5. Canonical Map Extrapolation
    const canonicalIndex = promoteEdges(reconciliationTrace, boostedEdges, state.edgesByAdapter);
    const capabilityEnforcement = enforceCapabilities(this.registry);

    // 6. Security & Stability Assessment
    const trustSnapshot = this.trustRegistry.toSnapshot();
    const stabilityIndex = computeGraphStabilityIndex(
      reconciliationTrace,
      canonicalIndex,
      state.adjacencyMap as Record<string, any>,
      state.crossings || [],
      this.trustRegistry
    );

    // 7. Topology Insight Indexing
    const coverageIndex = computeCoverageIndex(
      this.registry, 'memory_layer',
      state.adjacencyMap as Record<string, any>,
      state.routeServiceMap || {},
    );
    const provenanceIndex = buildProvenanceIndex(canonicalIndex.edges, trustSnapshot.base_scores);

    const identityParity = runParityHarness(
      state.adjacencyMap as Record<string, any>,
      state.entitySources || [],
    );

    const heatmap = computeCompletenessHeatmap(
      state.adjacencyMap as Record<string, any>,
      state.routeServiceMap || {},
      coverageIndex,
    );
    const correlation = computeCorrelation(coverageIndex, stabilityIndex);

    // Compute derived path confidence average
    const average_path_confidence = reachability.length > 0
      ? Number((reachability.reduce((acc, e) => acc + e.path_confidence, 0) / reachability.length).toFixed(4))
      : 0;

    const priorityPlan = generateAdapterPriorityPlan(
      coverageIndex,
      correlation,
      stabilityIndex,
      heatmap,
      average_path_confidence
    );

    // 8. Yield immutable result — snapshots only, no live references
    return {
      capabilitySnapshot,
      trustSnapshot,
      reconciliationTrace,
      boostedEdges,
      reachability,
      capabilityNegotiation,
      canonicalIndex,
      capabilityEnforcement,
      stabilityIndex,
      coverageIndex,
      provenanceIndex,
      identityParity,
      heatmap,
      correlation,
      priorityPlan
    };
  }
}
