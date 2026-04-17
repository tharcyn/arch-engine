import type { PolicyPackMetadata } from './PolicyPackMetadata';

export interface PolicyPackDatasetCapabilityFinding {
    readonly policyPackId: string;
    readonly code: string;
    readonly status: 'compatible' | 'partially-compatible' | 'incompatible' | 'skipped';
    readonly capability: string;
    readonly message: string;
}

export interface PolicyPackDatasetCapabilityDiagnostic {
    readonly overallStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown';
    readonly findings: readonly PolicyPackDatasetCapabilityFinding[];
    readonly summaryMessage: string;
}

export function assessPolicyPackDatasetCapabilityCompatibility(
    activeCapabilityManifest: Record<string, boolean> | undefined,
    installedPacks: readonly PolicyPackMetadata[]
): PolicyPackDatasetCapabilityDiagnostic {
    const findings: PolicyPackDatasetCapabilityFinding[] = [];
    const manifest = activeCapabilityManifest || {};

    let hasIncompatible = false;
    let hasPartiallyCompatible = false;
    let evaluatedPacks = 0;

    for (const pack of installedPacks) {
        const required = pack.requiredDatasetCapabilities || [];
        const optional = pack.optionalDatasetCapabilities || [];

        if (required.length === 0 && optional.length === 0) {
            continue; // Nothing to evaluate for this pack
        }

        evaluatedPacks++;

        for (const cap of required) {
            if (manifest[cap] === true) {
                findings.push({
                    policyPackId: pack.policyPackId,
                    code: 'POLICY_PACK_DATASET_CAPABILITY_COMPATIBLE',
                    status: 'compatible',
                    capability: cap,
                    message: `Required dataset capability '${cap}' is present`
                });
            } else {
                hasIncompatible = true;
                findings.push({
                    policyPackId: pack.policyPackId,
                    code: 'POLICY_PACK_DATASET_CAPABILITY_MISSING_REQUIRED',
                    status: 'incompatible',
                    capability: cap,
                    message: `Policy pack '${pack.policyPackId}' requires dataset capability '${cap}' which is missing`
                });
            }
        }

        for (const cap of optional) {
            if (manifest[cap] === true) {
                findings.push({
                    policyPackId: pack.policyPackId,
                    code: 'POLICY_PACK_DATASET_CAPABILITY_COMPATIBLE',
                    status: 'compatible',
                    capability: cap,
                    message: `Optional dataset capability '${cap}' is present`
                });
            } else {
                hasPartiallyCompatible = true;
                findings.push({
                    policyPackId: pack.policyPackId,
                    code: 'POLICY_PACK_DATASET_CAPABILITY_MISSING_OPTIONAL',
                    status: 'partially-compatible',
                    capability: cap,
                    message: `Policy pack '${pack.policyPackId}' optionally supports dataset capability '${cap}' which is missing`
                });
            }
        }
    }

    let overallStatus: PolicyPackDatasetCapabilityDiagnostic['overallStatus'];
    if (evaluatedPacks === 0) {
        overallStatus = 'unknown'; // Or compatible? The prompt says "all required capabilities present -> compatible". If none are required, it's effectively compatible, but unknown is also okay. Wait, let's use 'compatible' for zero requirements, to avoid falsely degrading the status if no packs require capabilities.
    }

    if (hasIncompatible) {
        overallStatus = 'incompatible';
    } else if (hasPartiallyCompatible) {
        overallStatus = 'partially-compatible';
    } else {
        overallStatus = 'compatible';
    }

    let summaryMessage = `Policy-pack capability compatibility: ${overallStatus}`;
    if (overallStatus === 'incompatible') {
        const missingReq = findings.filter(f => f.code === 'POLICY_PACK_DATASET_CAPABILITY_MISSING_REQUIRED').map(f => f.capability);
        const uniqueReq = Array.from(new Set(missingReq));
        summaryMessage += `. Missing required dataset capability: ${uniqueReq.join(', ')}`;
    }

    return {
        overallStatus,
        findings,
        summaryMessage
    };
}
