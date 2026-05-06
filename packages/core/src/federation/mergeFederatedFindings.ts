import { computeFindingStructuralHash } from '../policy/normalizePolicyPackFinding.js';
import type { NormalizedPolicyPackFinding } from '../policy/PolicyPackFinding.js';

// Federation-internal extension of NormalizedPolicyPackFinding.
// providerProvenance / datasetProvenance are NOT part of the v1.0.x public
// PolicyPackFinding type; they're carried on the runtime object only by the
// federation subsystem. Cast through this shape locally instead of widening
// the public type.
type FederatedFinding = NormalizedPolicyPackFinding & {
    providerProvenance?: readonly string[];
    datasetProvenance?: readonly string[];
};

export interface MergedFederatedFindings {
    readonly findings: readonly NormalizedPolicyPackFinding[];
    readonly totalFindings: number;
    readonly totalDeduplicated: number;
}

export function mergeFederatedFindings(
    findingsList: ReadonlyArray<readonly NormalizedPolicyPackFinding[]>
): MergedFederatedFindings {
    const uniqueFindings = new Map<string, NormalizedPolicyPackFinding>();
    let totalFindings = 0;

    for (const findings of findingsList) {
        for (const finding of findings) {
            totalFindings++;
            const hash = computeFindingStructuralHash(finding);
            if (!uniqueFindings.has(hash)) {
                // Initialize the finding with empty arrays if not present
                const initialFinding = { ...finding } as FederatedFinding;
                if (!initialFinding.providerProvenance) (initialFinding as any).providerProvenance = [];
                if (!initialFinding.datasetProvenance) (initialFinding as any).datasetProvenance = [];
                uniqueFindings.set(hash, initialFinding);
            } else {
                const existing = uniqueFindings.get(hash)! as FederatedFinding;
                const incoming = finding as FederatedFinding;
                // Merge provenance arrays
                const mergedProviders = new Set(existing.providerProvenance);
                if (incoming.providerProvenance) incoming.providerProvenance.forEach((p: string) => mergedProviders.add(p));

                const mergedDatasets = new Set(existing.datasetProvenance);
                if (incoming.datasetProvenance) incoming.datasetProvenance.forEach((d: string) => mergedDatasets.add(d));

                (existing as any).providerProvenance = Array.from(mergedProviders).sort();
                (existing as any).datasetProvenance = Array.from(mergedDatasets).sort();
            }
        }
    }

    const findings = Array.from(uniqueFindings.values()).sort((a, b) => {
        const hashA = computeFindingStructuralHash(a);
        const hashB = computeFindingStructuralHash(b);
        return hashA.localeCompare(hashB);
    });

    return {
        findings,
        totalFindings,
        totalDeduplicated: totalFindings - uniqueFindings.size
    };
}
