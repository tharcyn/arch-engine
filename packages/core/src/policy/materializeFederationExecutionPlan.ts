import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig.js';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from './PolicyRegistryLockfile.js';
import type { ExternalTopologyDataset } from '../topology/external-topology-types.js';
import type { PolicyPackMetadata } from './PolicyPackMetadata.js';
import { assessFederationExecutionPreflight, type FederationExecutionPreflightDiagnostic } from './assessFederationExecutionPreflight.js';

export interface FederationExecutionPlanPackEntry {
    readonly policyPackId: string;
    readonly executionStatus: 'runnable' | 'degraded' | 'blocked' | 'skipped';
    readonly compatibilitySummary: string;
    readonly blockingFindings: readonly string[];
    readonly humanReadableReason: string;
}

/**
 * Represents the execution planning stage outcome.
 * Planning decides WHICH packs to execute based on permission granted in preflight.
 */
export interface FederationExecutionPlanDiagnostic {
    readonly allowed: boolean;
    readonly overallPlanStatus: 'complete' | 'partial' | 'empty' | 'blocked' | 'invalid' | 'unknown';
    readonly preflightStatus: string;
    readonly totalPolicyPacks: number;
    readonly runnablePolicyPacks: number;
    readonly blockedPolicyPacks: number;
    readonly degradedPolicyPacks: number;
    readonly packResults: readonly FederationExecutionPlanPackEntry[];
    readonly preflightDiagnostic: FederationExecutionPreflightDiagnostic;
    readonly suggestedNextAction?: string;
}

export function materializeFederationExecutionPlan(
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
): FederationExecutionPlanDiagnostic {
    const preflight = assessFederationExecutionPreflight(
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

    let allowed = preflight.allowed;
    let overallPlanStatus: FederationExecutionPlanDiagnostic['overallPlanStatus'] = 'unknown';

    const packEntries: FederationExecutionPlanPackEntry[] = [];
    let runnableCount = 0;
    let blockedCount = 0;
    let degradedCount = 0;

    const executionCompat = preflight.underlyingReadinessDiagnostic.policyPackExecutionCompatibility;

    if (preflight.overallStatus === 'invalid') {
        overallPlanStatus = 'invalid';
    } else if (preflight.overallStatus === 'blocked') {
        overallPlanStatus = 'blocked';
    }

    if (installedPolicyPacks) {
        for (const pack of installedPolicyPacks) {
            const packResult = executionCompat?.packResults.find(p => p.policyPackId === pack.policyPackId);
            
            let executionStatus: FederationExecutionPlanPackEntry['executionStatus'] = 'runnable';
            let summary = 'Compatible';
            const blockingFindings: string[] = [];
            let reason = 'Ready to execute.';

            if (overallPlanStatus === 'invalid' || overallPlanStatus === 'blocked') {
                executionStatus = 'blocked';
                summary = 'Blocked by preflight';
                reason = `Execution blocked globally by: ${preflight.primaryBlockReason || 'unknown reason'}`;
                blockingFindings.push(preflight.summaryMessage);
            } else if (!packResult) {
                // If it's not blocked globally, but we lack result data, we skip it
                executionStatus = 'skipped';
                summary = 'Missing execution data';
                reason = 'No execution compatibility data available.';
            } else if (packResult.executionStatus === 'incompatible') {
                executionStatus = 'blocked';
                summary = 'Incompatible with dataset';
                reason = 'Missing required capabilities or governance surfaces.';
                blockingFindings.push(...packResult.capabilityFindings.map(f => f.message));
                blockingFindings.push(...packResult.governanceFindings.map(f => f.message));
            } else if (packResult.executionStatus === 'partially-compatible') {
                executionStatus = 'degraded';
                summary = 'Partially compatible';
                reason = 'Missing optional capabilities, execution allowed but degraded.';
            }

            if (executionStatus === 'runnable') runnableCount++;
            if (executionStatus === 'blocked') blockedCount++;
            if (executionStatus === 'degraded') degradedCount++;

            packEntries.push({
                policyPackId: pack.policyPackId,
                executionStatus,
                compatibilitySummary: summary,
                blockingFindings,
                humanReadableReason: reason
            });
        }
    }

    if (overallPlanStatus === 'unknown' || (overallPlanStatus !== 'invalid' && overallPlanStatus !== 'blocked')) {
        if (installedPolicyPacks && installedPolicyPacks.length > 0) {
            if (runnableCount > 0 && blockedCount === 0 && degradedCount === 0) {
                overallPlanStatus = 'complete';
            } else if (runnableCount === 0 && degradedCount === 0 && blockedCount > 0) {
                overallPlanStatus = 'blocked';
                allowed = false;
            } else if ((runnableCount > 0 || degradedCount > 0) && (blockedCount > 0 || degradedCount > 0)) {
                overallPlanStatus = 'partial';
            } else if (runnableCount === 0 && degradedCount === 0 && blockedCount === 0) {
                overallPlanStatus = 'empty';
            }
        } else {
            overallPlanStatus = 'empty';
        }
    }

    let suggestedNextAction = preflight.suggestedNextAction;
    if (overallPlanStatus === 'empty') {
        suggestedNextAction = suggestedNextAction || 'Inspect policy-pack metadata or dataset compatibility.';
    } else if (overallPlanStatus === 'partial' || overallPlanStatus === 'blocked') {
        if (blockedCount > 0 && !suggestedNextAction) {
            suggestedNextAction = 'Inspect missing capability/governance surface for blocked packs.';
        }
    }

    return {
        allowed,
        overallPlanStatus,
        preflightStatus: preflight.overallStatus,
        totalPolicyPacks: installedPolicyPacks ? installedPolicyPacks.length : 0,
        runnablePolicyPacks: runnableCount,
        blockedPolicyPacks: blockedCount,
        degradedPolicyPacks: degradedCount,
        packResults: packEntries,
        preflightDiagnostic: preflight,
        suggestedNextAction
    };
}
