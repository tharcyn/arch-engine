import type { PolicyPackFinding, NormalizedPolicyPackFinding } from './PolicyPackFinding.js';
import { validateOrNormalizePolicyPackFindingCode } from './validateOrNormalizePolicyPackFindingCode.js';

export function normalizePolicyPackFinding(finding: PolicyPackFinding): NormalizedPolicyPackFinding {
    const category = finding.category || 'policy-pack';
    const codeResult = validateOrNormalizePolicyPackFindingCode(finding.code, category);

    // providerProvenance / datasetProvenance are federation-internal fields
    // that are not part of the v1.0.x public PolicyPackFinding type. Accessed
    // via `as any` so the public type contract stays frozen while the
    // post-v1.0 federation subsystem can still pass them through.
    const findingRaw = finding as PolicyPackFinding & {
        providerProvenance?: readonly string[];
        datasetProvenance?: readonly string[];
    };

    const normalized: NormalizedPolicyPackFinding = {
        severity: finding.severity || 'warning',
        message: finding.message || 'Unknown finding',
        code: codeResult.code,
        category,
        surface: finding.surface,
        affectedEntity: finding.affectedEntity,
        classification: finding.classification,
        confidence: finding.confidence,
        scope: finding.scope,
        authorityBoundaryCrossing: finding.authorityBoundaryCrossing,
        mutationClass: finding.mutationClass,
        policyPackId: finding.policyPackId,
        policyRuleId: finding.policyRuleId,
        evaluationMode: finding.evaluationMode,
        ...(findingRaw.providerProvenance !== undefined ? { providerProvenance: findingRaw.providerProvenance } : {}),
        ...(findingRaw.datasetProvenance !== undefined ? { datasetProvenance: findingRaw.datasetProvenance } : {}),
    } as NormalizedPolicyPackFinding;

    const isRepaired = codeResult.taxonomyRepaired || finding._taxonomyRepaired === true;

    if (isRepaired) {
        Object.assign(normalized, { taxonomyRepaired: true });
    }

    // Strip legacy property if it exists in raw finding to avoid leaking it
    delete (normalized as any)._taxonomyRepaired;

    return normalized;
}

export type NormalizedFindingStructuralHash = string;

import { createHash } from 'crypto';

export function computeFindingStructuralHash(finding: NormalizedPolicyPackFinding): NormalizedFindingStructuralHash {
    const payload = [
        finding.policyRuleId || finding.code || '',
        finding.classification || finding.category || '',
        finding.scope || finding.surface || '',
        finding.authorityBoundaryCrossing || '',
        finding.mutationClass || ''
    ].join('|');
    return createHash('sha256').update(payload).digest('hex');
}
