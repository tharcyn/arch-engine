/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/core — Public Access Boundary
 * ═══════════════════════════════════════════════════════════
 *
 *  Only formal SDK contracts and data protocol interfaces
 *  are exported here. Internal implementations are strictly
 *  retained behind the module boundary.
 *
 *  DESIGN LAW: No free-function lifecycle APIs.
 *  All adapter registration/freeze operations are instance
 *  methods on EngineRunner. Module-level mutable state is
 *  forbidden.
 */

// ─── 1. Adapter SDK Type Contracts ──────────────────────

export type {
  ArchitectureAdapter,
  AdapterPack,
  AdapterContext,
  AdapterManifest,
} from './sdk/adapter-contract';

// ─── 2. Engine Manifests & Capability Types ──────────────

export type {
  EngineManifest,
  CompatibilityResult,
} from './manifest/manifest-loader';

export { loadEngineManifest, parseEngineManifest, validateAdapterCompatibility } from './manifest/manifest-loader';

export type {
  CapabilityMap,
  CoverageLevel,
  AdapterCapabilityDescriptor,
} from './adapters/capability-registry';

export * from './traversal/graph-stability-index';

export * from './policy/index';

// ─── 3. Reasoning Protocol & JSON Outlines ───────────────

export type {
  ReasoningProtocolV1
} from './protocol/reasoning-protocol-v1';

// ─── 4. Trust & Confidence Type Contracts ────────────────

export type {
  AdapterTrustScore,
  EdgeTypeTrustOverride,
  TrustRankingConfig,
} from './adapters/trust-ranking';

export type {
  EdgeConfidenceLevel,
  EdgeConfidenceMetadata
} from './confidence/edge-confidence';

export type {
  ReconcilableEdge
} from './reconciliation/edge-reconciliation';

export type {
  ClassificationStrategy
} from './provenance/edge-provenance-schema';

// ─── 5. Runner Orchestration ────────────────────────────

export {
  EngineRunner
} from './runner/engine-runner';

export type {
  EngineExecutionState,
  EngineExecutionResult,
  EngineRunnerOptions,
} from './runner/engine-runner';

// ─── 6. Graph Schema Types ─────────────────────────────
//
//  Input contract types for EngineRunner.executePipeline().
//  These define the shape of data consumers must provide
//  to the reasoning pipeline.
//
//  NOTE: IdentifiableEntity and EntitySourceCollection are
//  intentionally internal. They serve the optional identity
//  parity harness, not core engine reasoning. Consumers of
//  entitySources can pass structurally compatible data
//  without importing a dedicated type.

export type {
  AdjacencyNode,
  BlastRadius,
  RouteServiceMap,
  RouteServiceEntry,
  AuthorityCrossing,
} from './runner/engine-runner';
