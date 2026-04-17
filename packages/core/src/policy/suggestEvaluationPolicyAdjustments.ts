import type { FederationFindingInspectionReport } from './inspectFederationEvaluationFindings.js';
import type { FederationEvaluationPolicyDecision } from './assessFederationEvaluationPolicyGate.js';

export type FederationPolicySuggestionType = 'code_override' | 'category_override' | 'taxonomy_cleanup' | 'waiver_review';

export interface FederationPolicySuggestionEntry {
    readonly suggestionType: FederationPolicySuggestionType;
    readonly target: string;
    readonly suggestedAction: string;
    readonly rationale: string;
    readonly isRisky: boolean;
    readonly snippetType?: 'code_override' | 'category_override' | 'waiver';
    readonly snippetJson?: any;
    readonly snippetPathHint?: string;
    readonly profileTarget?: string;
    readonly profileTargetSource?: FederationPolicySuggestionProfileTargetSource;
}

export type FederationPolicySuggestionProfileTargetSource = 
    | 'effective-policy'
    | 'policy-file-default'
    | 'cli-selected'
    | 'inferred-from-path-hint'
    | 'synthetic-fallback'
    | 'unknown';

export interface FederationPolicySuggestionContext {
    readonly cliSelectedProfile?: string;
    readonly policyFileDefaultProfile?: string;
    readonly resolvedEffectiveProfile?: string;
}

export interface FederationEvaluationPolicySuggestions {
    readonly suggestions: readonly FederationPolicySuggestionEntry[];
    readonly summaryMessage: string;
}

export function suggestEvaluationPolicyAdjustments(
    report: FederationFindingInspectionReport,
    decision?: FederationEvaluationPolicyDecision,
    context?: FederationPolicySuggestionContext
): FederationEvaluationPolicySuggestions {
    const suggestions: FederationPolicySuggestionEntry[] = [];
    
    let profileTarget: string | undefined = undefined;
    let profileTargetSource: FederationPolicySuggestionProfileTargetSource = 'unknown';

    if (context?.cliSelectedProfile) {
        profileTarget = context.cliSelectedProfile;
        profileTargetSource = 'cli-selected';
    } else if (context?.policyFileDefaultProfile) {
        profileTarget = context.policyFileDefaultProfile;
        profileTargetSource = 'policy-file-default';
    } else if (context?.resolvedEffectiveProfile) {
        profileTarget = context.resolvedEffectiveProfile;
        profileTargetSource = 'effective-policy';
    } else {
        profileTarget = 'default';
        profileTargetSource = 'synthetic-fallback';
    }

    const basePath = `profiles.${profileTarget}`;

    // Taxonomy Cleanup
    for (const code of report.taxonomyRepairedCodes) {
        suggestions.push({
            suggestionType: 'taxonomy_cleanup',
            target: code,
            suggestedAction: 'Fix pack taxonomy',
            rationale: `Finding code '${code}' was repaired during normalization. Fix the policy pack emitting this finding instead of suppressing it in policy.`,
            isRisky: false
        });
    }

    // Identify codes that have warnings or errors
    const failingCodesByCategory = new Map<string, typeof report.codeSummaries[0][]>();

    for (const codeSum of report.codeSummaries) {
        if (codeSum.countsBySeverity.warning > 0 || codeSum.countsBySeverity.error > 0) {
            const list = failingCodesByCategory.get(codeSum.category) || [];
            list.push(codeSum);
            failingCodesByCategory.set(codeSum.category, list);
        }
    }

    // Code and Category Overrides
    for (const [category, codes] of failingCodesByCategory.entries()) {
        if (codes.length === 1) {
            const codeSum = codes[0];
            suggestions.push({
                suggestionType: 'code_override',
                target: codeSum.code,
                suggestedAction: 'Add codeOverride',
                rationale: `Repeated findings from exact code '${codeSum.code}'. Consider a targeted code override.`,
                isRisky: codeSum.coreReserved,
                snippetType: 'code_override',
                snippetJson: { [codeSum.code]: 'info' },
                snippetPathHint: `${basePath}.codeOverrides`,
                profileTarget,
                profileTargetSource
            });
        } else if (codes.length > 1) {
            const hasCoreReserved = codes.some(c => c.coreReserved);
            suggestions.push({
                suggestionType: 'category_override',
                target: category,
                suggestedAction: 'Add categoryOverride',
                rationale: `Multiple distinct codes (${codes.map(c => c.code).join(', ')}) in category '${category}' have warnings/errors. Consider a broader category override.`,
                isRisky: hasCoreReserved,
                snippetType: 'category_override',
                snippetJson: { [category]: 'info' },
                snippetPathHint: `${basePath}.categoryOverrides`,
                profileTarget,
                profileTargetSource
            });
        }
    }

    // Waiver Review
    if (decision?.waiverAudit) {
        if (decision.waiverAudit.totalWaiversUnused > 0) {
            suggestions.push({
                suggestionType: 'waiver_review',
                target: 'unused_waivers',
                suggestedAction: 'Remove unused waivers',
                rationale: `${decision.waiverAudit.totalWaiversUnused} waiver(s) did not match any findings. Consider cleaning up policy file.`,
                isRisky: false
            });
        }
        
        if (decision.waiverAudit.waiverAffectedOutcome) {
            suggestions.push({
                suggestionType: 'waiver_review',
                target: 'outcome_affecting_waivers',
                suggestedAction: 'Review outcome-affecting waivers',
                rationale: 'Outcome-affecting waived findings are present. Consider policy review or formal code overrides instead of temporary waivers.',
                isRisky: true,
                snippetType: 'waiver',
                snippetJson: { "code": "TARGET_CODE", "reason": "TBD", "owner": "@team", "validUntil": "YYYY-MM-DD" },
                snippetPathHint: `${basePath}.waivers`,
                profileTarget,
                profileTargetSource
            });
        }
    }

    // Stable sort suggestions
    suggestions.sort((a, b) => {
        if (a.suggestionType !== b.suggestionType) return a.suggestionType.localeCompare(b.suggestionType);
        return a.target.localeCompare(b.target);
    });

    let summaryMessage = 'No policy adjustments suggested. Architecture baseline is clean.';
    if (suggestions.length > 0) {
        const riskyCount = suggestions.filter(s => s.isRisky).length;
        summaryMessage = `Found ${suggestions.length} candidate policy adjustments (${riskyCount} risky).`;
    }

    return {
        suggestions,
        summaryMessage
    };
}
