import type { 
    FederationEvaluationPolicySuggestions, 
    FederationPolicySuggestionEntry,
    FederationPolicySuggestionProfileTargetSource
} from './suggestEvaluationPolicyAdjustments.js';

export interface FederationEvaluationPolicyPatchArtifact {
    readonly targetProfile?: string;
    readonly targetProfileSource: FederationPolicySuggestionProfileTargetSource;
    readonly targetProfileAuthoritative: boolean;
    readonly evaluationContextFingerprint?: string;
    readonly proposedCodeOverrides: Record<string, string>;
    readonly proposedCategoryOverrides: Record<string, string>;
    readonly proposedWaivers: any[];
    readonly includedSuggestions: readonly FederationPolicySuggestionEntry[];
    readonly excludedRiskySuggestions: readonly FederationPolicySuggestionEntry[];
    readonly excludedNonAuthoritativeSuggestions: readonly FederationPolicySuggestionEntry[];
    readonly summaryMessage: string;
}

const AUTHORITATIVE_SOURCES: FederationPolicySuggestionProfileTargetSource[] = [
    'cli-selected',
    'policy-file-default',
    'effective-policy'
];

function isAuthoritative(source?: FederationPolicySuggestionProfileTargetSource): boolean {
    if (!source) return false;
    return AUTHORITATIVE_SOURCES.includes(source);
}

function sortRecordKeys(record: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(record).sort()) {
        sorted[key] = record[key];
    }
    return sorted;
}

export function generateEvaluationPolicyPatchArtifact(
    suggestionsInput: FederationEvaluationPolicySuggestions,
    profileTarget: string | undefined,
    profileTargetSource: FederationPolicySuggestionProfileTargetSource,
    evaluationContextFingerprint?: string
): FederationEvaluationPolicyPatchArtifact {
    const targetProfileAuthoritative = isAuthoritative(profileTargetSource);

    const includedSuggestions: FederationPolicySuggestionEntry[] = [];
    const excludedRiskySuggestions: FederationPolicySuggestionEntry[] = [];
    const excludedNonAuthoritativeSuggestions: FederationPolicySuggestionEntry[] = [];

    const rawCodeOverrides: Record<string, string> = {};
    const rawCategoryOverrides: Record<string, string> = {};
    const proposedWaivers: any[] = [];

    for (const sug of suggestionsInput.suggestions) {
        if (!sug.snippetJson || !sug.snippetType) continue; // Only process snippet-bearing suggestions

        const source = sug.profileTargetSource || profileTargetSource;
        const suggestionAuthoritative = isAuthoritative(source);

        if (!suggestionAuthoritative) {
            excludedNonAuthoritativeSuggestions.push(sug);
        } else if (sug.isRisky) {
            excludedRiskySuggestions.push(sug);
        } else {
            includedSuggestions.push(sug);
            if (sug.snippetType === 'code_override') {
                Object.assign(rawCodeOverrides, sug.snippetJson);
            } else if (sug.snippetType === 'category_override') {
                Object.assign(rawCategoryOverrides, sug.snippetJson);
            } else if (sug.snippetType === 'waiver') {
                proposedWaivers.push(sug.snippetJson);
            }
        }
    }

    let summaryMessage = '';
    if (!targetProfileAuthoritative) {
        summaryMessage = `Generated scaffold patch. Target profile '${profileTarget || 'unknown'}' from source '${profileTargetSource}' is not authoritative. Safe in-file mutation is not implied.`;
    } else {
        summaryMessage = `Generated authoritative patch for profile '${profileTarget}' from source '${profileTargetSource}'.`;
    }

    return {
        targetProfile: profileTarget,
        targetProfileSource: profileTargetSource,
        targetProfileAuthoritative,
        evaluationContextFingerprint,
        proposedCodeOverrides: sortRecordKeys(rawCodeOverrides),
        proposedCategoryOverrides: sortRecordKeys(rawCategoryOverrides),
        proposedWaivers,
        includedSuggestions,
        excludedRiskySuggestions,
        excludedNonAuthoritativeSuggestions,
        summaryMessage
    };
}
