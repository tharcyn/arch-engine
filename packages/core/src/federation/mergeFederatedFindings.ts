import { computeFindingStructuralHash } from '../policy/normalizePolicyPackFinding.js';
import type { NormalizedPolicyPackFinding } from '../policy/normalizePolicyPackFinding.js';

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
                const initialFinding = { ...finding };
                if (!initialFinding.providerProvenance) (initialFinding as any).providerProvenance = [];
                if (!initialFinding.datasetProvenance) (initialFinding as any).datasetProvenance = [];
                uniqueFindings.set(hash, initialFinding);
            } else {
                const existing = uniqueFindings.get(hash)!;
                // Merge provenance arrays
                const mergedProviders = new Set(existing.providerProvenance);
                if (finding.providerProvenance) finding.providerProvenance.forEach(p => mergedProviders.add(p));
                
                const mergedDatasets = new Set(existing.datasetProvenance);
                if (finding.datasetProvenance) finding.datasetProvenance.forEach(d => mergedDatasets.add(d));

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
