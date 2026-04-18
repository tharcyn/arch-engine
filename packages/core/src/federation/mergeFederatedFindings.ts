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
                uniqueFindings.set(hash, finding);
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
