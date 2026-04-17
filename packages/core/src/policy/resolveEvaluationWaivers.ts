import type { NormalizedPolicyPackFinding } from './PolicyPackFinding.js';
import type { FederationEvaluationWaiver } from './assessFederationEvaluationPolicyGate.js';

export function getMatchingWaiver(
    finding: NormalizedPolicyPackFinding,
    packId: string,
    waivers?: readonly FederationEvaluationWaiver[]
): FederationEvaluationWaiver | null {
    if (!waivers || waivers.length === 0) {
        return null;
    }

    for (const waiver of waivers) {
        // A waiver matches if all its defined fields match the finding
        let matches = true;

        if (waiver.code !== undefined && waiver.code !== finding.code) {
            matches = false;
        }

        if (waiver.category !== undefined && waiver.category !== finding.category) {
            matches = false;
        }

        if (waiver.packName !== undefined && waiver.packName !== packId) {
            matches = false;
        }

        // Must define at least one targeting field to be valid
        const hasCondition = waiver.code !== undefined || waiver.category !== undefined || waiver.packName !== undefined;

        if (matches && hasCondition) {
            return waiver;
        }
    }

    return null;
}
