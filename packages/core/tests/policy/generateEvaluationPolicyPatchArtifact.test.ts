import { describe, test, expect } from 'vitest';
import { generateEvaluationPolicyPatchArtifact } from '../../src/policy/generateEvaluationPolicyPatchArtifact';
import type { FederationEvaluationPolicySuggestions, FederationPolicySuggestionEntry } from '../../src/policy/suggestEvaluationPolicyAdjustments';

describe('Phase 16U generateEvaluationPolicyPatchArtifact', () => {

    test('assembles authoritative safe suggestions', () => {
        const suggestions: FederationEvaluationPolicySuggestions = {
            summaryMessage: 'Found 1',
            suggestions: [
                {
                    suggestionType: 'code_override',
                    target: 'TRUST_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: '...',
                    isRisky: false,
                    snippetType: 'code_override',
                    snippetJson: { TRUST_01: 'info' },
                    profileTargetSource: 'cli-selected'
                } as FederationPolicySuggestionEntry
            ]
        };

        const artifact = generateEvaluationPolicyPatchArtifact(suggestions, 'ci', 'cli-selected');

        expect(artifact.targetProfileAuthoritative).toBe(true);
        expect(artifact.includedSuggestions).toHaveLength(1);
        expect(artifact.proposedCodeOverrides).toEqual({ TRUST_01: 'info' });
        expect(artifact.excludedRiskySuggestions).toHaveLength(0);
        expect(artifact.excludedNonAuthoritativeSuggestions).toHaveLength(0);
    });

    test('excludes risky suggestions from automatic assembly', () => {
        const suggestions: FederationEvaluationPolicySuggestions = {
            summaryMessage: 'Found 1',
            suggestions: [
                {
                    suggestionType: 'code_override',
                    target: 'ARCH_TRUST_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: '...',
                    isRisky: true,
                    snippetType: 'code_override',
                    snippetJson: { ARCH_TRUST_01: 'info' },
                    profileTargetSource: 'cli-selected'
                } as FederationPolicySuggestionEntry
            ]
        };

        const artifact = generateEvaluationPolicyPatchArtifact(suggestions, 'ci', 'cli-selected');

        expect(artifact.targetProfileAuthoritative).toBe(true);
        expect(artifact.includedSuggestions).toHaveLength(0);
        expect(artifact.proposedCodeOverrides).toEqual({});
        expect(artifact.excludedRiskySuggestions).toHaveLength(1);
    });

    test('generates scaffold patch for synthetic-fallback targets', () => {
        const suggestions: FederationEvaluationPolicySuggestions = {
            summaryMessage: 'Found 1',
            suggestions: [
                {
                    suggestionType: 'code_override',
                    target: 'TRUST_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: '...',
                    isRisky: false,
                    snippetType: 'code_override',
                    snippetJson: { TRUST_01: 'info' },
                    profileTargetSource: 'synthetic-fallback'
                } as FederationPolicySuggestionEntry
            ]
        };

        const artifact = generateEvaluationPolicyPatchArtifact(suggestions, 'default', 'synthetic-fallback');

        expect(artifact.targetProfileAuthoritative).toBe(false);
        expect(artifact.includedSuggestions).toHaveLength(0);
        expect(artifact.proposedCodeOverrides).toEqual({});
        expect(artifact.excludedNonAuthoritativeSuggestions).toHaveLength(1);
        expect(artifact.summaryMessage).toContain('is not authoritative');
    });

    test('merges compatible overrides and preserves deterministic ordering', () => {
        const suggestions: FederationEvaluationPolicySuggestions = {
            summaryMessage: 'Found 2',
            suggestions: [
                {
                    suggestionType: 'code_override',
                    target: 'ZETA_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: '...',
                    isRisky: false,
                    snippetType: 'code_override',
                    snippetJson: { ZETA_01: 'warning' },
                    profileTargetSource: 'cli-selected'
                } as FederationPolicySuggestionEntry,
                {
                    suggestionType: 'code_override',
                    target: 'ALPHA_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: '...',
                    isRisky: false,
                    snippetType: 'code_override',
                    snippetJson: { ALPHA_01: 'info' },
                    profileTargetSource: 'cli-selected'
                } as FederationPolicySuggestionEntry
            ]
        };

        const artifact = generateEvaluationPolicyPatchArtifact(suggestions, 'ci', 'cli-selected');

        expect(artifact.includedSuggestions).toHaveLength(2);
        // JS guarantees ordering based on insertion, but Object.keys() will return sorted if we sorted it
        expect(Object.keys(artifact.proposedCodeOverrides)).toEqual(['ALPHA_01', 'ZETA_01']);
    });
});
