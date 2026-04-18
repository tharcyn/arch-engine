import * as semver from 'semver';
import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';

export interface VersionResolutionPlan {
    readonly requestedId: string;
    readonly requestedRange: string;
    readonly resolvedPack: RegistryPolicyPackManifest | null;
    readonly diagnostics: string;
}

export function resolvePolicyPackVersions(
    availablePacks: readonly RegistryPolicyPackManifest[],
    packRequirements: Record<string, string> // Map of packId -> semverRange
): VersionResolutionPlan[] {
    const plans: VersionResolutionPlan[] = [];

    for (const [requestedId, requestedRange] of Object.entries(packRequirements)) {
        // Find all packs with matching ID
        const candidates = availablePacks.filter(p => p.policyPackId === requestedId);
        
        if (candidates.length === 0) {
            plans.push({
                requestedId,
                requestedRange,
                resolvedPack: null,
                diagnostics: `No policy pack found with ID: ${requestedId}`
            });
            continue;
        }

        // Sort descending to get the latest compatible version
        candidates.sort((a, b) => semver.rcompare(a.policyPackVersion, b.policyPackVersion));

        const resolvedPack = candidates.find(p => semver.satisfies(p.policyPackVersion, requestedRange));

        if (resolvedPack) {
            plans.push({
                requestedId,
                requestedRange,
                resolvedPack,
                diagnostics: `Resolved to version ${resolvedPack.policyPackVersion}`
            });
        } else {
            plans.push({
                requestedId,
                requestedRange,
                resolvedPack: null,
                diagnostics: `No version satisfies range ${requestedRange}. Available: ${candidates.map(c => c.policyPackVersion).join(', ')}`
            });
        }
    }

    // Sort deterministically
    plans.sort((a, b) => a.requestedId.localeCompare(b.requestedId));
    
    return plans;
}
