import { describe, expect, test } from 'vitest';
import { resolveEvaluationPolicyTargetProfile } from '../../src/policy/resolveEvaluationPolicyTargetProfile.js';
import type { FederationEvaluationPolicySuggestions } from '../../src/policy/suggestEvaluationPolicyAdjustments.js';

describe('Phase 16Y resolveEvaluationPolicyTargetProfile', () => {

    test('suggestions override all context profiles', () => {
        const suggestions: FederationEvaluationPolicySuggestions = {
            suggestions: [
                {
                    suggestionType: 'add_code_override',
                    target: 'rule-1',
                    suggestedAction: 'override',
                    rationale: 'test',
                    isRisky: false,
                    profileTarget: 'sug-profile',
                    profileTargetSource: 'cli-selected'
                }
            ],
            summaryMessage: 'test'
        };

        const result = resolveEvaluationPolicyTargetProfile(suggestions, {
            cliSelectedProfile: 'cli-profile',
            policyFileDefaultProfile: 'default-profile',
            resolvedEffectiveProfile: 'effective-profile'
        });

        expect(result.targetProfile).toBe('sug-profile');
        expect(result.targetProfileSource).toBe('cli-selected');
    });

    test('cli-selected profile overrides policy profiles when no suggestions present', () => {
        const suggestions: FederationEvaluationPolicySuggestions = { suggestions: [], summaryMessage: '' };

        const result = resolveEvaluationPolicyTargetProfile(suggestions, {
            cliSelectedProfile: 'cli-profile',
            policyFileDefaultProfile: 'default-profile',
            resolvedEffectiveProfile: 'effective-profile'
        });

        expect(result.targetProfile).toBe('cli-profile');
        expect(result.targetProfileSource).toBe('cli-selected');
    });

    test('policy-file-default used when cli absent', () => {
        const suggestions: FederationEvaluationPolicySuggestions = { suggestions: [], summaryMessage: '' };

        const result = resolveEvaluationPolicyTargetProfile(suggestions, {
            policyFileDefaultProfile: 'default-profile',
            resolvedEffectiveProfile: 'effective-profile'
        });

        expect(result.targetProfile).toBe('default-profile');
        expect(result.targetProfileSource).toBe('policy-file-default');
    });

    test('effective-profile used when cli and default absent', () => {
        const suggestions: FederationEvaluationPolicySuggestions = { suggestions: [], summaryMessage: '' };

        const result = resolveEvaluationPolicyTargetProfile(suggestions, {
            resolvedEffectiveProfile: 'effective-profile'
        });

        expect(result.targetProfile).toBe('effective-profile');
        expect(result.targetProfileSource).toBe('effective-policy');
    });

    test('synthetic-fallback used when no context available', () => {
        const suggestions: FederationEvaluationPolicySuggestions = { suggestions: [], summaryMessage: '' };

        const result = resolveEvaluationPolicyTargetProfile(suggestions, {});

        expect(result.targetProfile).toBe('default');
        expect(result.targetProfileSource).toBe('synthetic-fallback');
    });

});
