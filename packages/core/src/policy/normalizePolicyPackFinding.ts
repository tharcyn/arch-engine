import type { PolicyPackFinding, NormalizedPolicyPackFinding } from './PolicyPackFinding.js';
import { validateOrNormalizePolicyPackFindingCode } from './validateOrNormalizePolicyPackFindingCode.js';

export function normalizePolicyPackFinding(finding: PolicyPackFinding): NormalizedPolicyPackFinding {
    const category = finding.category || 'policy-pack';
    const codeResult = validateOrNormalizePolicyPackFindingCode(finding.code, category);

    const normalized: NormalizedPolicyPackFinding = {
        severity: finding.severity || 'warning',
        message: finding.message || 'Unknown finding',
        code: codeResult.code,
        category,
        surface: finding.surface,
        affectedEntity: finding.affectedEntity,
        classification: finding.classification
    };

    const isRepaired = codeResult.taxonomyRepaired || finding._taxonomyRepaired === true;

    if (isRepaired) {
        Object.assign(normalized, { taxonomyRepaired: true });
    }

    // Strip legacy property if it exists in raw finding to avoid leaking it
    delete (normalized as any)._taxonomyRepaired;

    return normalized;
}
