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
export { verifyCapabilityRegistryIntegrity } from './capabilities/CapabilityRegistry';
export type { CapabilityRegistryIntegrityResult } from './capabilities/CapabilityRegistry';

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

// ─── 7. Topology Dataset Ingestion ────────────────────────────

export {
  loadExternalTopologyDataset,
} from './topology/ExternalTopologyDatasetLoader';

export {
  routeDatasetFormat,
} from './topology/DatasetFormatRouter';

export {
  verifySchemaCompatibility,
} from './topology/SchemaCompatibilityGate';

export {
  verifyCapabilityManifestCompatibility,
} from './topology/CapabilityManifestGate';

export {
  runDatasetIngestionPipeline,
} from './topology/DatasetIngestionPipeline';

export type {
  DatasetIngestionDiagnostic,
  ExternalTopologyDataset,
  ExternalTopologyDatasetLoaded,
  DatasetFormatValidated,
  SchemaCompatibilityVerified,
  CapabilityManifestCompatibilityVerified,
  ValidatedTopologyDataset,
  DatasetIngestionPipelineReady,
} from './topology/external-topology-types';

export {
  TopologyDatasetIngestionError,
} from './topology/external-topology-types';

export type {
  ValidatorTopologyView,
  ValidatorTopologyIdentitySurface,
  ValidatorTopologyCapabilitySurface,
} from './topology/validator-topology-view';

export {
  projectValidatedDatasetToValidatorView,
} from './topology/projectValidatedDatasetToValidatorView';

// ─── 8. Validator Substrate ───────────────────────────────────

export type {
  ValidatorRunnerResultEnvelope,
} from './validators/validator-runner-envelope';

export type {
  ValidatorSeverity,
  ValidatorDiagnostic,
  ValidatorResult,
} from './validators/validator-result';

export type {
  TopologyValidator,
} from './validators/TopologyValidator';

export {
  ValidatorRunner,
} from './validators/ValidatorRunner';

// ─── 9. Topology Parsing Substrate ────────────────────────────

export type {
  TopologyNode,
} from './topology/TopologyNode';

export type {
  TopologyEdge,
} from './topology/TopologyEdge';

export type {
  TopologyGraph,
} from './topology/TopologyGraph';

export {
  extractTopologyGraph,
} from './topology/extractTopologyGraph';

export {
  computeGraphSurfaceHash,
} from './topology/computeGraphSurfaceHash';

export {
  getNodeById,
  getOutgoingEdges,
  getIncomingEdges,
} from './topology/topologyGraphTraversal';

export type {
  TopologyGraphIndex,
} from './topology/TopologyGraphIndex';

export {
  buildTopologyGraphIndex,
} from './topology/buildTopologyGraphIndex';

export {
  getDirectNeighbors,
  hasPath,
  getReachableNodeIds,
} from './topology/topologyGraphReachability';

export type {
  GraphValidatorUtilityResult,
} from './topology/graph-validator-utility-result';

export {
  validateNodeExists,
  validateRequiredEdge,
  validateReachability,
  validateRequiredNeighbors,
} from './topology/topologyGraphValidatorUtilities';

// ─── 10. Topology Structural Diff Substrate ───────────────────

export type {
  TopologyDiffResult,
} from './topology/TopologyDiffResult';

export {
  diffTopologyGraphs,
} from './topology/diffTopologyGraphs';

export type {
  TopologyMetadataDiff,
} from './topology/TopologyMetadataDiff';

export {
  diffTopologyMetadata,
} from './topology/diffTopologyMetadata';

export type {
  TopologyChangeKind,
} from './topology/TopologyChangeKind';

export type {
  TopologyDiffClassification,
} from './topology/TopologyDiffClassification';

export {
  classifyTopologyDiff,
} from './topology/classifyTopologyDiff';

export type {
  PolicyRelevantDiffKind,
} from './topology/PolicyRelevantDiffKind';

export type {
  PolicyRelevantDiff,
} from './topology/PolicyRelevantDiff';

export {
  classifyPolicyRelevantDiff,
} from './topology/classifyPolicyRelevantDiff';

export type {
  TopologyDiffConsumer,
} from './topology/TopologyDiffConsumer';

export {
  DiffConsumerRunner,
} from './topology/DiffConsumerRunner';

export type {
  PolicyEvaluationSeverity,
} from './topology/PolicyEvaluationSeverity';

export type {
  PolicyEvaluationDiagnostic,
} from './topology/PolicyEvaluationDiagnostic';

export type {
  PolicyEvaluationResult,
} from './topology/PolicyEvaluationResult';

export type {
  TopologyPolicyPack,
} from './topology/TopologyPolicyPack';

export type {
  PolicyPackMetadata,
} from './policy/PolicyPackMetadata';
export type {
  PolicyRegistryLockfile,
  PolicyRegistryLockEntry,
  PolicyRegistryLockfileSignatureEntry
} from './policy/PolicyRegistryLockfile';
export type {
  PolicyRegistryLockfileDiff,
} from './policy/PolicyRegistryLockfileDiff';
export { diffPolicyRegistryLockfile } from './policy/diffPolicyRegistryLockfile';
export type {
  LockfileTrustStore,
} from './policy/LockfileTrustStore';
export { StaticLockfileTrustStore } from './policy/LockfileTrustStore';
export type {
  LockfileSignerStore,
} from './policy/LockfileSignerStore';
export { StaticLockfileSignerStore } from './policy/LockfileSignerStore';
export type { LockfileSignerConfig, ResolvedSignerIdentity, SignerLifecycleStatus } from './policy/LockfileSignerConfig';
export type { LockfileTrustDiagnostic, LockfileTrustFailureReason } from './policy/LockfileTrustDiagnostic';
export type { LockfileFreshnessDiagnostic } from './policy/LockfileFreshnessDiagnostic';
export type { LockfileRefreshDiagnostic } from './policy/LockfileRefreshDiagnostic';
export type { LockfileInstallEnforcementDiagnostic, LockfileEnforcementMode } from './policy/LockfileInstallEnforcementDiagnostic';
export { assessPolicyRegistryLockfileFreshness } from './policy/assessPolicyRegistryLockfileFreshness';
export { refreshPolicyRegistryLockfile } from './policy/refreshPolicyRegistryLockfile';
export type { RefreshPolicyRegistryLockfileResult } from './policy/refreshPolicyRegistryLockfile';
export { enforcePolicyRegistryLockfileInstall } from './policy/enforcePolicyRegistryLockfileInstall';
export type {
  PolicyRegistryLockfileSignatureVerificationResult,
} from './policy/verifyPolicyRegistryLockfileSignature';
export { verifyPolicyRegistryLockfileSignature } from './policy/verifyPolicyRegistryLockfileSignature';
export type { SignPolicyRegistryLockfileResult } from './policy/signPolicyRegistryLockfile';
export { signPolicyRegistryLockfile } from './policy/signPolicyRegistryLockfile';
export type { TrustPolicyAuditDiagnostic, TrustPolicyFinding, TrustPolicyReadiness, TrustPolicyFindingSeverity } from './policy/TrustPolicyAuditDiagnostic';
export { auditTrustPolicyConfig } from './policy/auditTrustPolicyConfig';
export type { LockfileRuntimeReadinessDiagnostic, RuntimeReadinessStatus } from './policy/LockfileRuntimeReadinessDiagnostic';
export { assessLockfileRuntimeReadiness } from './policy/assessLockfileRuntimeReadiness';
export type { LockfileMigrationAdvisory } from './policy/adviseLockfileMigration';
export { adviseLockfileMigration } from './policy/adviseLockfileMigration';
export { extractLockfileDatasetIdentity } from './policy/extractLockfileDatasetIdentity';
export { assessDatasetRuntimeCompatibility, DEFAULT_ENGINE_RUNTIME_METADATA } from './policy/assessDatasetRuntimeCompatibility';
export type { DatasetRuntimeCompatibilityDiagnostic, DatasetCompatibilityFinding, EngineRuntimeMetadata } from './policy/assessDatasetRuntimeCompatibility';
export { assessPolicyPackDatasetCapabilityCompatibility } from './policy/assessPolicyPackDatasetCapabilityCompatibility';
export type { PolicyPackDatasetCapabilityDiagnostic, PolicyPackDatasetCapabilityFinding } from './policy/assessPolicyPackDatasetCapabilityCompatibility';
export { assessPolicyPackGovernanceSurfaceCompatibility } from './policy/assessPolicyPackGovernanceSurfaceCompatibility';
export type { PolicyPackGovernanceCompatibilityDiagnostic, PolicyPackGovernanceCompatibilityFinding, PolicyPackGovernanceCompatibilityStatus } from './policy/assessPolicyPackGovernanceSurfaceCompatibility';
export { assessPolicyPackExecutionCompatibility } from './policy/assessPolicyPackExecutionCompatibility';
export type { PolicyPackExecutionCompatibilityDiagnostic, PolicyPackExecutionFinding, PolicyPackExecutionResult, PolicyPackExecutionCompatibilityStatus } from './policy/assessPolicyPackExecutionCompatibility';
export { assessFederationExecutionPreflight } from './policy/assessFederationExecutionPreflight';
export type { FederationExecutionPreflightDiagnostic } from './policy/assessFederationExecutionPreflight';
export { materializeFederationExecutionPlan } from './policy/materializeFederationExecutionPlan';
export type { FederationExecutionPlanDiagnostic, FederationExecutionPlanPackEntry } from './policy/materializeFederationExecutionPlan';
export { runFederationEvaluationPlan } from './policy/runFederationEvaluationPlan';
export type { FederationEvaluationResult, FederationEvaluationPackResult, NormalizedPolicyPackEvaluationResult } from './policy/runFederationEvaluationPlan';
export { explainFederationEvaluationResult } from './policy/explainFederationEvaluationResult';
export type { FederationEvaluationExplanation, FederationEvaluationPackExplanation } from './policy/explainFederationEvaluationResult';
export { aggregateFederationEvaluationSeverity } from './policy/aggregateFederationEvaluationSeverity';
export type { FederationEvaluationSeveritySummary, FederationEvaluationPackSeveritySummary } from './policy/aggregateFederationEvaluationSeverity';
export { assessFederationEvaluationPolicyGate } from './policy/assessFederationEvaluationPolicyGate';
export type { FederationEvaluationSeverityThreshold, FederationEvaluationGatePolicy, FederationEvaluationSeverityThresholdInput, FederationEvaluationPolicyDecision } from './policy/assessFederationEvaluationPolicyGate';
export { resolveFindingSeverityThreshold } from './policy/resolveFindingSeverityThreshold';
export { validateEvaluationPolicyFile } from './policy/validateEvaluationPolicyFile';
export { validateOrNormalizePolicyPackFindingCode, RESERVED_CORE_CODE_PREFIX, UNKNOWN_CODE, MALFORMED_CODE } from './policy/validateOrNormalizePolicyPackFindingCode';
export { normalizePolicyPackFinding, computeFindingStructuralHash } from './policy/normalizePolicyPackFinding';
export type { NormalizedFindingStructuralHash } from './policy/normalizePolicyPackFinding';
export { verifyEvaluationCompatibilityMatrix } from './policy/verifyEvaluationCompatibilityMatrix';
export type { EvaluationCompatibilityMatrixResult } from './policy/verifyEvaluationCompatibilityMatrix';
export type { PolicyPackExecutionContext } from './policy/PolicyPackExecutionContext';
export type { PolicyPackFinding, NormalizedPolicyPackFinding, PolicyPackFindingCategory } from './policy/PolicyPackFinding';
export type { PolicyPackEvaluationResult } from './policy/PolicyPackEvaluationResult';
export type { PolicyPackEvaluator } from './policy/PolicyPackEvaluator';

export type {
  PolicyExecutionContext,
  ExecutionContextStructuralHash
} from './policy/PolicyExecutionContext';
export { computeExecutionContextHash } from './policy/PolicyExecutionContext';

export type {
  PolicyPackManifest,
} from './policy/PolicyPackManifest';

export {
  validatePolicyPackManifest,
} from './policy/validatePolicyPackManifest';

export type {
  PolicyPackSignatureVerificationResult,
} from './policy/PolicyPackSignatureVerificationResult';

export {
  verifyPolicyPackSignature,
} from './policy/verifyPolicyPackSignature';

export type {
  PolicyPackCompatibilityResult,
} from './policy/PolicyPackCompatibilityResult';

export {
  validatePolicyPackCompatibility,
} from './policy/validatePolicyPackCompatibility';

export type {
  TrustPolicyConfig,
} from './trust/TrustPolicyConfig';

export {
  validateTrustPolicyConfig,
} from './trust/validateTrustPolicyConfig';

export {
  ARCH_ENGINE_VERSION,
} from './version.js';

export {
  PolicyPackRunner,
} from './topology/PolicyPackRunner';

// ─── 12. Policy Evaluation Aggregation Surface ────────────────

export type {
  PolicyEvaluationSummaryStatus,
} from './topology/PolicyEvaluationSummaryStatus';

export type {
  PolicyEvaluationSummary,
} from './topology/PolicyEvaluationSummary';

export {
  summarizePolicyEvaluations,
} from './topology/summarizePolicyEvaluations';

// ─── 13. Governance Report Surface ────────────────────────────

export type {
  GovernanceReport,
} from './topology/GovernanceReport';

export {
  buildGovernanceReport,
} from './topology/buildGovernanceReport';

// ─── 14. CLI Output Formatter Surface ─────────────────────────

export {
  formatGovernanceReportForCLI,
} from './topology/formatGovernanceReportForCLI';

// ─── 15. JSON Output Mode Surface ─────────────────────────────

export {
  formatGovernanceReportAsJSON,
} from './topology/formatGovernanceReportAsJSON';

// ─── 16. Explain Mode Surface ─────────────────────────────────

export type {
  ExecutionInputMode,
} from './topology/ExecutionInputMode';

export type {
  ExplainSection,
} from './topology/ExplainSection';

export type {
  ExplainReport,
} from './topology/ExplainReport';

export {
  buildExplainReport,
} from './topology/buildExplainReport';

export {
  formatExplainReportForCLI,
} from './topology/formatExplainReportForCLI';

export {
  formatExplainReportAsJSON,
} from './topology/formatExplainReportAsJSON';

// ─── 17. Exit Code Mapping Surface ────────────────────────────

export type {
  GovernanceExitCode,
} from './topology/GovernanceExitCode';

export {
  mapGovernanceReportToExitCode,
} from './topology/mapGovernanceReportToExitCode';

// ─── 18. Snapshot Persistence Surface ─────────────────────────

export type {
  TopologySnapshot,
} from './topology/TopologySnapshot';

export {
  buildTopologySnapshot,
} from './topology/buildTopologySnapshot';

// ─── 19. Snapshot Compatibility Validation Surface ────────────

export type {
  TopologySnapshotCompatibilityResult,
} from './topology/TopologySnapshotCompatibilityResult';

export {
  validateTopologySnapshotCompatibility,
} from './topology/validateTopologySnapshotCompatibility';

export type {
  TopologySnapshotLineageValidationResult,
} from './topology/TopologySnapshotLineageValidationResult';

export {
  validateTopologySnapshotLineage,
} from './topology/validateTopologySnapshotLineage';

// ─── 20. Snapshot Graph Extraction Surface ────────────────────

export {
  extractTopologyGraphFromSnapshot,
} from './topology/extractTopologyGraphFromSnapshot';

// ─── Post-v1.0.0 surfaces — INTENTIONALLY NOT EXPORTED for v1.0.x ──
//
// The federation/, policy-registry/, and policy-bundles/ subsystems
// were prototyped after the v1.0.0 public surface freeze. Their
// implementation files remain on disk, but they are NOT part of the
// v1.0.x published API. Re-exporting them here would expand the
// public surface and break the strict-patch contract enforced by
// packages/core/tests/freeze/distribution_exports_surface.test.ts,
// packages/core/tests/freeze/distribution_declaration_surface.test.ts,
// packages/core/tests/publicSurface.snapshot.test.ts, and
// packages/core/tests/sdk/core_public_surface_snapshot.test.ts.
//
// To consume any of these surfaces, import from the direct internal
// path (e.g. './federation/runFederatedEvaluationPlan.js') from
// inside the package — never through this public barrel — until
// they are formally promoted in a future minor release.
