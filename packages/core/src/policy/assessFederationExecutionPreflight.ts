import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig.js';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from './PolicyRegistryLockfile.js';
import type { ExternalTopologyDataset } from '../topology/external-topology-types.js';
import type { PolicyPackMetadata } from './PolicyPackMetadata.js';
import { assessLockfileRuntimeReadiness } from './assessLockfileRuntimeReadiness.js';
import type { LockfileRuntimeReadinessDiagnostic } from './LockfileRuntimeReadinessDiagnostic.js';

/**
 * Represents the initial execution permission stage.
 * Preflight decides IF the runtime environment is allowed to proceed to planning and evaluation.
 */
export interface FederationExecutionPreflightDiagnostic {
    readonly allowed: boolean;
    readonly overallStatus: 'ready' | 'degraded' | 'blocked' | 'invalid' | 'unknown';
    readonly enforcementMode: string;
    readonly lockfileReadinessStatus: string;
    readonly datasetCompatibilityStatus: string;
    readonly policyPackExecutionStatus: string;
    readonly primaryBlockReason?: string;
    readonly contributingFindings: readonly string[];
    readonly summaryMessage: string;
    readonly suggestedNextAction?: string;
    readonly underlyingReadinessDiagnostic: LockfileRuntimeReadinessDiagnostic;
}

export function assessFederationExecutionPreflight(
    trustConfig: TrustPolicyConfig,
    lockfilePath: string,
    lockfile: PolicyRegistryLockfile | undefined,
    liveRegistries: PolicyRegistryLockEntry[],
    activeDatasetIdentity?: PolicyRegistryLockfile['datasetIdentity'],
    activeCapabilityManifest?: Record<string, boolean>,
    activeMutationClassRegistry?: Record<string, unknown>,
    activeAuthorityScopeRegistry?: Record<string, unknown>,
    activeSurfaceConfidenceRegistry?: Record<string, unknown>,
    activeTrustBoundaryRules?: Record<string, unknown>,
    activeDataset?: ExternalTopologyDataset,
    installedPolicyPacks?: readonly PolicyPackMetadata[]
): FederationExecutionPreflightDiagnostic {
    const readiness = assessLockfileRuntimeReadiness(
        trustConfig,
        lockfilePath,
        lockfile,
        liveRegistries,
        activeDatasetIdentity,
        activeCapabilityManifest,
        activeMutationClassRegistry,
        activeAuthorityScopeRegistry,
        activeSurfaceConfidenceRegistry,
        activeTrustBoundaryRules,
        activeDataset,
        installedPolicyPacks
    );

    const enforcementMode = trustConfig.enforcementMode || 'permissive';
    const isStrict = enforcementMode === 'require-signature' || enforcementMode === 'require-signature-and-freshness';

    let allowed = true;
    let overallStatus: FederationExecutionPreflightDiagnostic['overallStatus'] = 'ready';
    let primaryBlockReason: string | undefined;
    let suggestedNextAction: string | undefined;
    const contributingFindings: string[] = [];

    const datasetCompat = readiness.datasetCompatibility;
    const executionCompat = readiness.policyPackExecutionCompatibility;

    const lockfileReadinessStatus = readiness.status;
    const datasetCompatibilityStatus = datasetCompat?.overallStatus || 'unknown';
    const policyPackExecutionStatus = executionCompat?.overallStatus || 'unknown';

    if (readiness.status === 'invalid') {
        allowed = false;
        overallStatus = 'invalid';
        primaryBlockReason = 'TRUST_POLICY_INVALID';
        contributingFindings.push('Trust policy configuration is invalid.');
        suggestedNextAction = 'Inspect trust.json configuration.';
    } else if (readiness.enforcement?.allowed === false) {
        allowed = false;
        overallStatus = 'blocked';
        primaryBlockReason = 'LOCKFILE_ENFORCEMENT_BLOCKED';
        contributingFindings.push(readiness.enforcement.message || 'Lockfile installation or validation blocked execution.');
        suggestedNextAction = 'Run `arch-engine policies doctor-trust` for enforcement details.';
    }

    if (allowed && datasetCompat?.overallStatus === 'incompatible') {
        if (isStrict) {
            allowed = false;
            overallStatus = 'blocked';
            primaryBlockReason = 'DATASET_INCOMPATIBLE';
            contributingFindings.push(datasetCompat.summaryMessage);
            suggestedNextAction = 'Inspect dataset compatibility via `arch-engine policies preflight`.';
        } else {
            overallStatus = 'degraded';
            contributingFindings.push(`Warning: ${datasetCompat.summaryMessage} (Permissive mode)`);
        }
    }

    if (allowed && executionCompat?.overallStatus === 'incompatible') {
        if (isStrict) {
            allowed = false;
            overallStatus = 'blocked';
            primaryBlockReason = 'POLICY_PACK_EXECUTION_INCOMPATIBLE';
            contributingFindings.push(executionCompat.summaryMessage);
            suggestedNextAction = 'Inspect missing capability/governance requirement via `arch-engine policies preflight`.';
        } else {
            overallStatus = 'degraded';
            contributingFindings.push(`Warning: ${executionCompat.summaryMessage} (Permissive mode)`);
        }
    }

    if (allowed) {
        if (readiness.status === 'degraded' || 
            datasetCompat?.overallStatus === 'partially-compatible' || 
            executionCompat?.overallStatus === 'partially-compatible') {
            overallStatus = 'degraded';
            if (readiness.freshness && !readiness.freshness.isFresh) {
                contributingFindings.push('Lockfile is stale.');
                suggestedNextAction = suggestedNextAction || 'refresh-lockfile';
            }
            if (readiness.migrationAdvisory?.recommendationStrength === 'strongly-recommended') {
                contributingFindings.push(`Migration strong advisory: ${readiness.migrationAdvisory.rationale}`);
                suggestedNextAction = suggestedNextAction || `refresh-lockfile --sign <replacement>`;
            }
            if (datasetCompat?.overallStatus === 'partially-compatible') {
                contributingFindings.push('Dataset is partially compatible.');
            }
            if (executionCompat?.overallStatus === 'partially-compatible') {
                contributingFindings.push('Policy packs are partially compatible.');
            }
        }
    }

    let summaryMessage = `Federation Preflight Execution Decision: ${allowed ? 'ALLOWED' : 'BLOCKED'}. Overall status: ${overallStatus}.`;
    if (!allowed && primaryBlockReason) {
        summaryMessage += ` Blocked by: ${primaryBlockReason}.`;
    }

    return {
        allowed,
        overallStatus,
        enforcementMode,
        lockfileReadinessStatus,
        datasetCompatibilityStatus,
        policyPackExecutionStatus,
        primaryBlockReason,
        contributingFindings,
        summaryMessage,
        suggestedNextAction,
        underlyingReadinessDiagnostic: readiness
    };
}
