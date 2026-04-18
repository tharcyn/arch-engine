import { createHash } from 'crypto';
import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';
import { resolvePolicyPackCompatibility } from './resolvePolicyPackCompatibility.js';

export interface FederatedPolicyPackExecutionPlan {
    readonly eligiblePolicyPacks: readonly RegistryPolicyPackManifest[];
    readonly blockedPolicyPacks: readonly RegistryPolicyPackManifest[];
    readonly capabilityIntersectionUsed: readonly string[];
    readonly selectionDiagnostics: readonly string[];
    readonly federatedCapabilityIntersectionHash: string;
    readonly federatedDatasetCompatibilityHash: string;
    readonly providerExecutionSetHash: string;
}

function hashJSON(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export function resolveFederatedPolicyPackPlan(
    availablePacks: readonly RegistryPolicyPackManifest[],
    federatedCapabilitiesIntersection: readonly string[],
    datasetSchemas: readonly string[],
    providerIds: readonly string[] = []
): FederatedPolicyPackExecutionPlan {
    const diagnostics: string[] = [];

    // Filter using compatibility engine
    const compatibility = resolvePolicyPackCompatibility(
        availablePacks,
        federatedCapabilitiesIntersection,
        datasetSchemas,
        'multi-provider-federated'
    );

    if (compatibility.blocked.length > 0) {
        diagnostics.push(`Blocked ${compatibility.blocked.length} policy packs due to compatibility constraints.`);
        if (compatibility.blockingCapabilities.length > 0) {
            diagnostics.push(`Missing federated capabilities: ${compatibility.blockingCapabilities.join(', ')}`);
        }
        if (compatibility.blockingExecutionModes.length > 0) {
            diagnostics.push(`Execution mode not supported: multi-provider-federated`);
        }
    }

    if (compatibility.eligible.length === 0) {
        diagnostics.push('CRITICAL: No eligible policy packs available for federated execution.');
    }

    return {
        eligiblePolicyPacks: compatibility.eligible,
        blockedPolicyPacks: compatibility.blocked,
        capabilityIntersectionUsed: federatedCapabilitiesIntersection,
        selectionDiagnostics: diagnostics,
        federatedCapabilityIntersectionHash: hashJSON([...federatedCapabilitiesIntersection].sort()),
        federatedDatasetCompatibilityHash: hashJSON([...datasetSchemas].sort()),
        providerExecutionSetHash: hashJSON([...providerIds].sort())
    };
}
