import type { FederationEvaluationGatePolicy } from './assessFederationEvaluationPolicyGate.js';
import type { FederationEvaluationPolicyFile } from './validateEvaluationPolicyFile.js';

export interface ResolvedPolicyProfile {
    readonly effectivePolicy: FederationEvaluationGatePolicy;
    readonly profileChain: readonly string[];
}

export function resolveEvaluationPolicyProfile(
    file: FederationEvaluationPolicyFile,
    profileName: string
): ResolvedPolicyProfile {
    if (!(profileName in file.profiles)) {
        throw new Error(`Profile '${profileName}' not found in policy file.`);
    }

    const chain: string[] = [];
    let current: string | undefined = profileName;

    // Collect chain
    while (current) {
        chain.push(current);
        current = file.profiles[current].extends;
    }

    // Resolve from base to child (reverse chain)
    const reversedChain = [...chain].reverse();

    let effectivePolicy: FederationEvaluationGatePolicy | null = null;

    for (const name of reversedChain) {
        const profile = file.profiles[name];
        if (!effectivePolicy) {
            effectivePolicy = {
                defaultThreshold: profile.defaultThreshold,
                ...(profile.categoryOverrides ? { categoryOverrides: { ...profile.categoryOverrides } } : {}),
                ...(profile.codeOverrides ? { codeOverrides: { ...profile.codeOverrides } } : {}),
                ...(profile.waivers && profile.waivers.length > 0 ? { waivers: [...profile.waivers] } : {}),
                ...(profile.rejectExpiredWaivers !== undefined ? { rejectExpiredWaivers: profile.rejectExpiredWaivers } : {}),
                ...(profile.rejectOutcomeAffectingWaiversWithoutOwner !== undefined ? { rejectOutcomeAffectingWaiversWithoutOwner: profile.rejectOutcomeAffectingWaiversWithoutOwner } : {}),
                ...(profile.rejectOutcomeAffectingWaiversWithoutTicket !== undefined ? { rejectOutcomeAffectingWaiversWithoutTicket: profile.rejectOutcomeAffectingWaiversWithoutTicket } : {}),
                ...(profile.rejectBroadWaiversWithoutReason !== undefined ? { rejectBroadWaiversWithoutReason: profile.rejectBroadWaiversWithoutReason } : {})
            };
        } else {
            effectivePolicy = {
                defaultThreshold: profile.defaultThreshold ?? effectivePolicy.defaultThreshold,
                ...(effectivePolicy.categoryOverrides || profile.categoryOverrides
                    ? { categoryOverrides: Object.assign({}, effectivePolicy.categoryOverrides || {}, profile.categoryOverrides || {}) }
                    : {}),
                ...(effectivePolicy.codeOverrides || profile.codeOverrides
                    ? { codeOverrides: Object.assign({}, effectivePolicy.codeOverrides || {}, profile.codeOverrides || {}) }
                    : {}),
                ...(effectivePolicy.waivers || profile.waivers
                    ? { waivers: [...(effectivePolicy.waivers || []), ...(profile.waivers || [])] }
                    : {}),
                ...(profile.rejectExpiredWaivers !== undefined ? { rejectExpiredWaivers: profile.rejectExpiredWaivers } : (effectivePolicy.rejectExpiredWaivers !== undefined ? { rejectExpiredWaivers: effectivePolicy.rejectExpiredWaivers } : {})),
                ...(profile.rejectOutcomeAffectingWaiversWithoutOwner !== undefined ? { rejectOutcomeAffectingWaiversWithoutOwner: profile.rejectOutcomeAffectingWaiversWithoutOwner } : (effectivePolicy.rejectOutcomeAffectingWaiversWithoutOwner !== undefined ? { rejectOutcomeAffectingWaiversWithoutOwner: effectivePolicy.rejectOutcomeAffectingWaiversWithoutOwner } : {})),
                ...(profile.rejectOutcomeAffectingWaiversWithoutTicket !== undefined ? { rejectOutcomeAffectingWaiversWithoutTicket: profile.rejectOutcomeAffectingWaiversWithoutTicket } : (effectivePolicy.rejectOutcomeAffectingWaiversWithoutTicket !== undefined ? { rejectOutcomeAffectingWaiversWithoutTicket: effectivePolicy.rejectOutcomeAffectingWaiversWithoutTicket } : {})),
                ...(profile.rejectBroadWaiversWithoutReason !== undefined ? { rejectBroadWaiversWithoutReason: profile.rejectBroadWaiversWithoutReason } : (effectivePolicy.rejectBroadWaiversWithoutReason !== undefined ? { rejectBroadWaiversWithoutReason: effectivePolicy.rejectBroadWaiversWithoutReason } : {}))
            };
        }
    }

    return {
        effectivePolicy: effectivePolicy!,
        profileChain: chain
    };
}
