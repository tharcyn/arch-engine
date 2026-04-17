import type { PolicyPackFindingCategory } from './PolicyPackFinding.js';
import type { FederationEvaluationSeverityThreshold, FederationEvaluationGatePolicy } from './assessFederationEvaluationPolicyGate.js';

export function resolveFindingSeverityThreshold(
    finding: { code?: string; category?: PolicyPackFindingCategory },
    policy: FederationEvaluationGatePolicy
): FederationEvaluationSeverityThreshold {
    if (finding.code && policy.codeOverrides && finding.code in policy.codeOverrides) {
        const override = policy.codeOverrides[finding.code];
        if (override) return override;
    }

    const category = finding.category || 'policy-pack';
    if (policy.categoryOverrides && category in policy.categoryOverrides) {
        const override = policy.categoryOverrides[category];
        if (override) return override;
    }
    
    return policy.defaultThreshold;
}
