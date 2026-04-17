import type { 
    FederationEvaluationPolicySuggestions, 
    FederationPolicySuggestionProfileTargetSource 
} from './suggestEvaluationPolicyAdjustments.js';

export interface ResolveEvaluationPolicyTargetProfileContext {
    cliSelectedProfile?: string;
    policyFileDefaultProfile?: string;
    resolvedEffectiveProfile?: string;
}

export interface ResolvedEvaluationPolicyTargetProfile {
    targetProfile: string;
    targetProfileSource: FederationPolicySuggestionProfileTargetSource;
}

export function resolveEvaluationPolicyTargetProfile(
    suggestionsObj: FederationEvaluationPolicySuggestions,
    context: ResolveEvaluationPolicyTargetProfileContext
): ResolvedEvaluationPolicyTargetProfile {
    if (suggestionsObj.suggestions.length > 0) {
        return {
            targetProfile: suggestionsObj.suggestions[0].profileTarget || 'default',
            targetProfileSource: suggestionsObj.suggestions[0].profileTargetSource || 'synthetic-fallback'
        };
    }

    if (context.cliSelectedProfile) {
        return {
            targetProfile: context.cliSelectedProfile,
            targetProfileSource: 'cli-selected'
        };
    }
    
    if (context.policyFileDefaultProfile) {
        return {
            targetProfile: context.policyFileDefaultProfile,
            targetProfileSource: 'policy-file-default'
        };
    }
    
    if (context.resolvedEffectiveProfile) {
        return {
            targetProfile: context.resolvedEffectiveProfile,
            targetProfileSource: 'effective-policy'
        };
    }

    return {
        targetProfile: 'default',
        targetProfileSource: 'synthetic-fallback'
    };
}
