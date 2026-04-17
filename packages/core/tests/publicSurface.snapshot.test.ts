import { describe, it, expect } from 'vitest';
import * as coreExports from '../dist/index.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  Public Surface Snapshot — Export Boundary Guard
 * ═══════════════════════════════════════════════════════════
 *
 *  Captures the full set of externally reachable symbols from
 *  the root barrel (@arch-engine/core).
 *
 *  INVARIANT: generateEntityId, EntityResolver, and
 *  RouteIdentityBuilder MUST NOT appear in this list.
 *  Identity helpers are internal-only.
 */

const APPROVED_EXPORTS = [
        "ARCH_ENGINE_VERSION",
        "DEFAULT_ENGINE_RUNTIME_METADATA",
        "DIAMOND_TRAVERSAL_CONTRACT_VERSION",
        "DiffConsumerRunner",
        "EngineRunner",
        "GOVERNANCE_TELEMETRY_SCHEMA_VERSION",
        "MALFORMED_CODE",
        "POLICY_PATCH_EXPORT_SCHEMA_VERSION",
        "POLICY_PR_PAYLOAD_SCHEMA_VERSION",
        "PolicyPackRunner",
        "RESERVED_CORE_CODE_PREFIX",
        "StaticLockfileSignerStore",
        "StaticLockfileTrustStore",
        "TopologyDatasetIngestionError",
        "UNKNOWN_CODE",
        "ValidatorRunner",
        "adviseLockfileMigration",
        "aggregateFederationEvaluationSeverity",
        "applyEvaluationPolicyPatchArtifact",
        "assessDatasetRuntimeCompatibility",
        "assessFederationEvaluationPolicyGate",
        "assessFederationExecutionPreflight",
        "assessLockfileRuntimeReadiness",
        "assessPolicyPackDatasetCapabilityCompatibility",
        "assessPolicyPackExecutionCompatibility",
        "assessPolicyPackGovernanceSurfaceCompatibility",
        "assessPolicyRegistryLockfileFreshness",
        "auditTrustPolicyConfig",
        "buildExplainReport",
        "buildGovernanceReport",
        "buildPolicyPatchPullRequestPayload",
        "buildTopologyGraphIndex",
        "buildTopologySnapshot",
        "classifyPolicyRelevantDiff",
        "classifyTopologyDiff",
        "computeEvaluationContextFingerprint",
        "computeExecutionContextHash",
        "computeExportArtifactIntegrityHash",
        "computeFindingStructuralHash",
        "computeGraphStabilityIndex",
        "computeGraphSurfaceHash",
        "computeWeightedBlastRadii",
        "deriveLockfileMigrationSuggestedAction",
        "diffPolicyRegistryLockfile",
        "diffTopologyGraphs",
        "diffTopologyMetadata",
        "enforcePolicyRegistryLockfileInstall",
        "evaluatePolicy",
        "executeLocalPolicyPack",
        "explainFederationEvaluationResult",
        "exportEvaluationPolicyPatchArtifact",
        "extractLockfileDatasetIdentity",
        "extractTopologyGraph",
        "extractTopologyGraphFromSnapshot",
        "formatExplainReportAsJSON",
        "formatExplainReportForCLI",
        "formatGovernanceReportAsJSON",
        "formatGovernanceReportForCLI",
        "generateEvaluationPolicyPatchArtifact",
        "getDirectNeighbors",
        "getIncomingEdges",
        "getMatchingWaiver",
        "getNodeById",
        "getOutgoingEdges",
        "getReachableNodeIds",
        "hasPath",
        "inspectFederationEvaluationFindings",
        "lintFederationFindingRegistry",
        "loadEngineManifest",
        "loadExternalTopologyDataset",
        "loadPolicyConfig",
        "mapGovernanceReportToExitCode",
        "materializeFederationExecutionPlan",
        "mutateEvaluationPolicyFileAst",
        "normalizePolicyPackFinding",
        "normalizeRepositoryHint",
        "parseEngineManifest",
        "projectValidatedDatasetToValidatorView",
        "rankAuthorityCrossings",
        "refreshPolicyRegistryLockfile",
        "resolveEvaluationPolicyProfile",
        "resolveEvaluationPolicyTargetProfile",
        "resolveFindingSeverityThreshold",
        "resolveRepositoryHint",
        "resolveSeverity",
        "routeDatasetFormat",
        "runDatasetIngestionPipeline",
        "runFederationEvaluationPlan",
        "scanBalancedObjectBlock",
        "signPolicyRegistryLockfile",
        "suggestEvaluationPolicyAdjustments",
        "summarizePolicyEvaluations",
        "validateAdapterCompatibility",
        "validateEvaluationPolicyFile",
        "validateNodeExists",
        "validateOrNormalizePolicyPackFindingCode",
        "validatePolicyPackCompatibility",
        "validatePolicyPackManifest",
        "validateReachability",
        "validateRequiredEdge",
        "validateRequiredNeighbors",
        "validateTopologySnapshotCompatibility",
        "validateTopologySnapshotLineage",
        "validateTrustPolicyConfig",
        "verifyCapabilityManifestCompatibility",
        "verifyCapabilityRegistryIntegrity",
        "verifyEvaluationCompatibilityMatrix",
        "verifyPolicyPackSignature",
        "verifyPolicyRegistryLockfileSignature",
        "verifySchemaCompatibility",
        "writeEvaluationPolicyPatch",
].sort();

const FORBIDDEN_IDENTITY_SYMBOLS = [
  'generateEntityId',
  'EntityResolver',
  'RouteIdentityBuilder',
  'slugify',
  'extractShortName',
  'computeHash'
];

describe('public surface snapshot — root barrel boundary', () => {

  it('exports only approved symbols', () => {
    const actualKeys = Object.keys(coreExports).sort();
    expect(actualKeys).toEqual(APPROVED_EXPORTS);
  });

  it('does not leak identity helpers through root barrel', () => {
    const actualKeys = Object.keys(coreExports);
    for (const forbidden of FORBIDDEN_IDENTITY_SYMBOLS) {
      expect(actualKeys).not.toContain(forbidden);
    }
  });

  it('snapshot matches approved export surface', () => {
    expect(Object.keys(coreExports).sort()).toMatchSnapshot();
  });
});
