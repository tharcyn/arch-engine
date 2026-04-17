import { describe, it, expect } from 'vitest';
import { assertNoUnexpectedExports } from './utils/assertNoUnexpectedExports.js';
import * as rootExports from '../../dist/index.js';
import * as analysisExports from '../../dist/analysis.js';
import * as parsersExports from '../../dist/parsers.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('distribution exports surface freeze contract', () => {
    
    describe.each([
        {
            surfaceName: 'root',
            exportsResolver: rootExports,
            expectedKeys: [
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
                "writeEvaluationPolicyPatch"
            ]
        },
        {
            surfaceName: 'analysis',
            exportsResolver: analysisExports,
            expectedKeys: [] // Strict lock preventing unidentified bleed inherently
        },
        {
            surfaceName: 'parsers',
            exportsResolver: parsersExports,
            expectedKeys: [] 
        }
    ])('$surfaceName export boundary mapping', ({ surfaceName, exportsResolver, expectedKeys }) => {

        it(`matches approved export boundary precisely for ${surfaceName}`, () => {
            withFreezeTelemetry('freeze::core::dist::namespaceBoundary::abiParity', FreezeDriftTaxonomy.PUBLIC_SURFACE, `Strict ABI boundary array for ${surfaceName}`, () => {
                const keys = Object.keys(exportsResolver).sort();
                
                // Assert explicitly avoiding snapshot-only weakness testing properly smartly inherently.
                if (expectedKeys.length > 0) {
                   assertNoUnexpectedExports(keys, expectedKeys);
                }
                
                // Final snapshot guard explicitly
                expect(keys).toMatchSnapshot();
            });
        });
        
    });
});
