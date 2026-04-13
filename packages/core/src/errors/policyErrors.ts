export enum PolicyRuntimeErrorCode {
  PATH_CYCLE_DETECTED = 'PATH_CYCLE_DETECTED',
  DUPLICATE_STACK_ENTRY = 'DUPLICATE_STACK_ENTRY',
  STACK_TOPOLOGY_VIOLATION = 'STACK_TOPOLOGY_VIOLATION',
  STACK_CHECKSUM_MISMATCH = 'STACK_CHECKSUM_MISMATCH',
  STACK_SEED_MISMATCH = 'STACK_SEED_MISMATCH',
  TOPOLOGY_VERSION_MISMATCH = 'TOPOLOGY_VERSION_MISMATCH',
  DIAMOND_CONTRACT_MISMATCH = 'DIAMOND_CONTRACT_MISMATCH',
  SEVERITY_LOCK_VIOLATION = 'SEVERITY_LOCK_VIOLATION',
  SEVERITY_POLICY_CONFLICT = 'SEVERITY_POLICY_CONFLICT',
  TOMBSTONE_SUPPRESSION_CONFLICT = 'TOMBSTONE_SUPPRESSION_CONFLICT',
  URI_RESOLUTION_FAILED = 'URI_RESOLUTION_FAILED',
  REGISTRY_LOOKUP_FAILED = 'REGISTRY_LOOKUP_FAILED',
  SEMVER_SELECTION_FAILED = 'SEMVER_SELECTION_FAILED',
  MANIFEST_HYDRATION_FAILED = 'MANIFEST_HYDRATION_FAILED',
  DEPENDENCY_RESOLUTION_FAILED = 'DEPENDENCY_RESOLUTION_FAILED',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  LOCKFILE_OVERRIDE_VIOLATION = 'LOCKFILE_OVERRIDE_VIOLATION',
  POLICY_DEPENDENCY_CYCLE_DETECTED = 'POLICY_DEPENDENCY_CYCLE_DETECTED',
  UNTRUSTED_NAMESPACE_REJECTION = 'UNTRUSTED_NAMESPACE_REJECTION',
  MIRROR_NAMESPACE_DIVERGENCE = 'MIRROR_NAMESPACE_DIVERGENCE',
  MANIFEST_CAPABILITY_INCOMPATIBLE = 'MANIFEST_CAPABILITY_INCOMPATIBLE',
  TRANSITIVE_CAPABILITY_INCOMPATIBLE = 'TRANSITIVE_CAPABILITY_INCOMPATIBLE',
  TRUST_POLICY_SNAPSHOT_DIVERGENCE = 'TRUST_POLICY_SNAPSHOT_DIVERGENCE',
  TRUST_SCOPE_NAMESPACE_REJECTION = 'TRUST_SCOPE_NAMESPACE_REJECTION',
  TRUST_SCOPE_SNAPSHOT_DIVERGENCE = 'TRUST_SCOPE_SNAPSHOT_DIVERGENCE',
  SNAPSHOT_CLOSURE_GRAPH_DIVERGENCE = 'SNAPSHOT_CLOSURE_GRAPH_DIVERGENCE',
  LOADER_PIPELINE_FAILED = 'LOADER_PIPELINE_FAILED',
  SEMVER_RANGE_NOT_SUPPORTED = 'SEMVER_RANGE_NOT_SUPPORTED',
  SNAPSHOT_ENVELOPE_INCOMPLETE = 'SNAPSHOT_ENVELOPE_INCOMPLETE',
  SNAPSHOT_ENVELOPE_VERSION_DRIFT = 'SNAPSHOT_ENVELOPE_VERSION_DRIFT',
  LOADER_METADATA_IMMUTABILITY_VIOLATION = 'LOADER_METADATA_IMMUTABILITY_VIOLATION',
  SNAPSHOT_ENVELOPE_FIELD_DRIFT = 'SNAPSHOT_ENVELOPE_FIELD_DRIFT',
  AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING = 'AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING',
  AUTHORITATIVE_TOPOLOGY_SURFACE_INCONSISTENT = 'AUTHORITATIVE_TOPOLOGY_SURFACE_INCONSISTENT',
  LOADER_METADATA_NOT_DEEPLY_FROZEN = 'LOADER_METADATA_NOT_DEEPLY_FROZEN',
  LOADER_METADATA_NON_PLAIN_OBJECT_DETECTED = 'LOADER_METADATA_NON_PLAIN_OBJECT_DETECTED',
  SNAPSHOT_ENVELOPE_IDENTITY_SURFACE_DRIFT = 'SNAPSHOT_ENVELOPE_IDENTITY_SURFACE_DRIFT',
  PLANNER_BOUNDARY_CONTRACT_VIOLATION = 'PLANNER_BOUNDARY_CONTRACT_VIOLATION',
  METADATA_GRAPH_SHAPE_INCONSISTENT = 'METADATA_GRAPH_SHAPE_INCONSISTENT',
  SNAPSHOT_TRANSPORT_COMPATIBILITY_FAILURE = 'SNAPSHOT_TRANSPORT_COMPATIBILITY_FAILURE',
  COMPOSITION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL = 'COMPOSITION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL',
  COMPOSITION_RUNTIME_CAPABILITY_MISMATCH = 'COMPOSITION_RUNTIME_CAPABILITY_MISMATCH',
  UNRESOLVABLE_POLICY_CONFLICT = 'UNRESOLVABLE_POLICY_CONFLICT',
  NAMESPACE_PRIORITY_AMBIGUOUS = 'NAMESPACE_PRIORITY_AMBIGUOUS',
  FALLBACK_RESOLUTION_INSUFFICIENT = 'FALLBACK_RESOLUTION_INSUFFICIENT',
  EXECUTION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL = 'EXECUTION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL',
  EVALUATION_CONTEXT_INVALID_STRUCTURE = 'EVALUATION_CONTEXT_INVALID_STRUCTURE',
  EXECUTION_CONTEXT_CAPABILITY_MISMATCH = 'EXECUTION_CONTEXT_CAPABILITY_MISMATCH',
  EXECUTION_CONTEXT_VALIDATION_FAILURE = 'EXECUTION_CONTEXT_VALIDATION_FAILURE',
  CONTEXT_FEDERATION_INCOMPATIBLE = 'CONTEXT_FEDERATION_INCOMPATIBLE',
  CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE = 'CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE',
  CAPABILITY_MATRIX_CANONICALIZATION_VERSION_MISMATCH = 'CAPABILITY_MATRIX_CANONICALIZATION_VERSION_MISMATCH',
  CAPABILITY_DESCRIPTOR_VERSION_INVALID = 'CAPABILITY_DESCRIPTOR_VERSION_INVALID'
}

export interface LoaderStageMetadata {
  contractVersion?: string;
  namespace?: string;
  resolvedVersion?: string;
  validationStage?: string;
  primaryManifestHash?: string;
}

export interface PolicyRuntimeErrorOptions {
  code: PolicyRuntimeErrorCode;
  message: string;
  policyId?: string;
  policyNamespace?: string;
  originLayer?: string;
  stackDepth?: number;
  contractVersion?: string;
  registrySource?: string;
  manifestSchemaVersion?: string;
  resolvedVersion?: string;
  loaderStageMetadata?: LoaderStageMetadata;
  cyclePath?: string[];
  missingCapabilities?: string[];
  mirrorNamespace?: string;
  trustDecisionSource?: string;
  requiredEngineVersion?: string;
  runtimeEngineVersion?: string;
  stage?: string;
  dependencySource?: string;
  fallbackApplied?: boolean;
  negotiationMode?: string;
  snapshotTrustPolicyHash?: string;
  scopeUsed?: string;
  namespaceTrustScopeHash?: string;
  activeTrustScopes?: string[];
  capabilityExplainabilityGraph?: any;
  capabilityClosureHash?: string;
  snapshotClosureGraphHash?: string;
  trustScopeExplainabilityGraph?: any;
  compositionHints?: string[];
  federationRejectionDiagnostics?: any;
}

export class PolicyRuntimeError extends Error {
  public code: PolicyRuntimeErrorCode;
  public policyId?: string;
  public policyNamespace?: string;
  public originLayer?: string;
  public stackDepth?: number;
  public contractVersion?: string;
  public registrySource?: string;
  public manifestSchemaVersion?: string;
  public resolvedVersion?: string;
  public loaderStageMetadata?: LoaderStageMetadata;
  public cyclePath?: string[];
  public missingCapabilities?: string[];
  public mirrorNamespace?: string;
  public trustDecisionSource?: string;
  public requiredEngineVersion?: string;
  public runtimeEngineVersion?: string;
  public stage?: string;
  public dependencySource?: string;
  public fallbackApplied?: boolean;
  public negotiationMode?: string;
  public snapshotTrustPolicyHash?: string;
  public scopeUsed?: string;
  public namespaceTrustScopeHash?: string;
  public activeTrustScopes?: string[];
  public capabilityExplainabilityGraph?: any;
  public capabilityClosureHash?: string;
  public snapshotClosureGraphHash?: string;
  public trustScopeExplainabilityGraph?: any;
  public compositionHints?: any;
  public federationRejectionDiagnostics?: any;
  constructor(options: PolicyRuntimeErrorOptions) {
    super(options.message);
    this.name = 'PolicyRuntimeError';
    this.code = options.code;
    this.stage = options.stage;
    this.innerError = options.innerError;
    this.metadata = options.metadata;
    this.documentNode = options.documentNode;
    this.expectedType = options.expectedType;
    this.actualType = options.actualType;
    this.policyId = options.policyId;
    this.failedRequirement = options.failedRequirement;
    this.policyNamespace = options.policyNamespace;
    this.originLayer = options.originLayer;
    this.stackDepth = options.stackDepth;
    this.contractVersion = options.contractVersion;
    this.registrySource = options.registrySource;
    this.manifestSchemaVersion = options.manifestSchemaVersion;
    this.resolvedVersion = options.resolvedVersion;
    this.loaderStageMetadata = options.loaderStageMetadata;
    this.cyclePath = options.cyclePath;
    this.missingCapabilities = options.missingCapabilities;
    this.mirrorNamespace = options.mirrorNamespace;
    this.trustDecisionSource = options.trustDecisionSource;
    this.requiredEngineVersion = options.requiredEngineVersion;
    this.runtimeEngineVersion = options.runtimeEngineVersion;
    this.dependencySource = options.dependencySource;
    this.fallbackApplied = options.fallbackApplied;
    this.negotiationMode = options.negotiationMode;
    this.snapshotTrustPolicyHash = options.snapshotTrustPolicyHash;
    this.scopeUsed = options.scopeUsed;
    this.namespaceTrustScopeHash = options.namespaceTrustScopeHash;
    this.activeTrustScopes = options.activeTrustScopes;
    this.capabilityExplainabilityGraph = options.capabilityExplainabilityGraph;
    this.capabilityClosureHash = options.capabilityClosureHash;
    this.snapshotClosureGraphHash = options.snapshotClosureGraphHash;
    this.trustScopeExplainabilityGraph = options.trustScopeExplainabilityGraph;
    this.compositionHints = options.compositionHints;
    this.federationRejectionDiagnostics = options.federationRejectionDiagnostics;
  }
}
