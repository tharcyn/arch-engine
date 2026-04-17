import type { PolicyPackMetadata } from './PolicyPackMetadata.js';
import { assessPolicyPackDatasetCapabilityCompatibility } from './assessPolicyPackDatasetCapabilityCompatibility.js';
import type { PolicyPackDatasetCapabilityFinding } from './assessPolicyPackDatasetCapabilityCompatibility.js';
import { assessPolicyPackGovernanceSurfaceCompatibility } from './assessPolicyPackGovernanceSurfaceCompatibility.js';
import type { PolicyPackGovernanceCompatibilityFinding } from './assessPolicyPackGovernanceSurfaceCompatibility.js';

export type PolicyPackExecutionCompatibilityStatus = 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown';

export interface PolicyPackExecutionFinding {
    readonly code: 'POLICY_PACK_EXECUTION_COMPATIBLE' | 'POLICY_PACK_EXECUTION_PARTIALLY_COMPATIBLE' | 'POLICY_PACK_EXECUTION_INCOMPATIBLE';
    readonly packId: string;
    readonly capabilityFindings: readonly PolicyPackDatasetCapabilityFinding[];
    readonly governanceFindings: readonly PolicyPackGovernanceCompatibilityFinding[];
}

export interface PolicyPackExecutionResult {
    readonly policyPackId: string;
    readonly capabilityStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown';
    readonly governanceStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown';
    readonly executionStatus: PolicyPackExecutionCompatibilityStatus;
    readonly capabilityFindings: readonly PolicyPackDatasetCapabilityFinding[];
    readonly governanceFindings: readonly PolicyPackGovernanceCompatibilityFinding[];
    readonly summaryMessage: string;
}

export interface PolicyPackExecutionCompatibilityDiagnostic {
    readonly overallStatus: PolicyPackExecutionCompatibilityStatus;
    readonly packResults: readonly PolicyPackExecutionResult[];
    readonly findings: readonly PolicyPackExecutionFinding[];
    readonly summaryMessage: string;
}

export function assessPolicyPackExecutionCompatibility(
    activeCapabilityManifest: Record<string, boolean> | undefined,
    activeMutationClassRegistry: Record<string, unknown> | undefined,
    activeAuthorityScopeRegistry: Record<string, unknown> | undefined,
    activeSurfaceConfidenceRegistry: Record<string, unknown> | undefined,
    activeTrustBoundaryRules: Record<string, unknown> | undefined,
    installedPacks: readonly PolicyPackMetadata[]
): PolicyPackExecutionCompatibilityDiagnostic {
    if (!installedPacks || installedPacks.length === 0) {
        return {
            overallStatus: 'unknown',
            packResults: [],
            findings: [],
            summaryMessage: 'No policy packs evaluated for execution compatibility.'
        };
    }

    const capabilityDiagnostic = assessPolicyPackDatasetCapabilityCompatibility(activeCapabilityManifest, installedPacks);
    const governanceDiagnostic = assessPolicyPackGovernanceSurfaceCompatibility(
        activeMutationClassRegistry,
        activeAuthorityScopeRegistry,
        activeSurfaceConfidenceRegistry,
        activeTrustBoundaryRules,
        installedPacks
    );

    const packResults: PolicyPackExecutionResult[] = [];
    const aggregateFindings: PolicyPackExecutionFinding[] = [];
    let overallIncompatible = false;
    let overallPartiallyCompatible = false;

    for (const pack of installedPacks) {
        const packId = pack.policyPackId;
        const capFindings = capabilityDiagnostic.findings.filter(f => f.policyPackId === packId);
        const govFindings = governanceDiagnostic.findings.filter(f => f.packId === packId);

        // Derive capability status for this specific pack
        let capStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown' = 'compatible';
        if (capFindings.length === 0 && (!pack.requiredDatasetCapabilities?.length) && (!pack.optionalDatasetCapabilities?.length)) {
            capStatus = 'compatible'; // nothing required
        } else if (capFindings.some(f => f.status === 'incompatible')) {
            capStatus = 'incompatible';
        } else if (capFindings.some(f => f.status === 'partially-compatible')) {
            capStatus = 'partially-compatible';
        }

        // Derive governance status for this specific pack
        let govStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown' = 'compatible';
        if (govFindings.length === 0 && (!pack.requiredMutationClasses?.length) && (!pack.requiredAuthorityScopes?.length) && (!pack.requiredSurfaceConfidenceKeys?.length) && (!pack.requiredTrustBoundaryRules?.length)) {
            govStatus = 'compatible';
        } else if (govFindings.length > 0) {
            // any finding in governance is currently an incompatible finding (all fields are required)
            govStatus = 'incompatible';
        }

        let execStatus: PolicyPackExecutionCompatibilityStatus;
        if (capStatus === 'incompatible' || govStatus === 'incompatible') {
            execStatus = 'incompatible';
            overallIncompatible = true;
        } else if (capStatus === 'partially-compatible' || (govStatus as string) === 'partially-compatible') {
            execStatus = 'partially-compatible';
            overallPartiallyCompatible = true;
        } else {
            execStatus = 'compatible';
        }

        let summaryMessage = `Pack ${packId} execution is ${execStatus}.`;
        if (execStatus === 'incompatible') {
            summaryMessage += ` Missing capabilities or governance surfaces.`;
        } else if (execStatus === 'partially-compatible') {
            summaryMessage += ` Missing optional features.`;
        }

        const findingCode = execStatus === 'incompatible' ? 'POLICY_PACK_EXECUTION_INCOMPATIBLE' :
                            execStatus === 'partially-compatible' ? 'POLICY_PACK_EXECUTION_PARTIALLY_COMPATIBLE' :
                            'POLICY_PACK_EXECUTION_COMPATIBLE';

        aggregateFindings.push({
            code: findingCode,
            packId,
            capabilityFindings: capFindings,
            governanceFindings: govFindings
        });

        packResults.push({
            policyPackId: packId,
            capabilityStatus: capStatus,
            governanceStatus: govStatus,
            executionStatus: execStatus,
            capabilityFindings: capFindings,
            governanceFindings: govFindings,
            summaryMessage
        });
    }

    let overallStatus: PolicyPackExecutionCompatibilityStatus = 'compatible';
    let summaryMessage = 'All policy packs are fully compatible for execution.';

    if (overallIncompatible) {
        overallStatus = 'incompatible';
        summaryMessage = `Execution blocked: 1 or more policy packs are incompatible with dataset capabilities or governance surfaces.`;
    } else if (overallPartiallyCompatible) {
        overallStatus = 'partially-compatible';
        summaryMessage = `Execution partially compatible: Some policy packs lack optional capabilities or governance support.`;
    }

    return {
        overallStatus,
        packResults,
        findings: aggregateFindings,
        summaryMessage
    };
}
