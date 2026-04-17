import { describe, test, expect } from 'vitest';
import { applyEvaluationPolicyPatchArtifact } from '../../src/policy/applyEvaluationPolicyPatchArtifact';
import type { FederationEvaluationPolicyPatchArtifact } from '../../src/policy/generateEvaluationPolicyPatchArtifact';
import type { FederationEvaluationPolicyFile } from '../../src/policy/validateEvaluationPolicyFile';

describe('Phase 16V applyEvaluationPolicyPatchArtifact', () => {

    test('refuses application when target is non-authoritative', () => {
        const artifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'default',
            targetProfileSource: 'synthetic-fallback',
            targetProfileAuthoritative: false,
            proposedCodeOverrides: {},
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [{}] as any,
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = applyEvaluationPolicyPatchArtifact('{}', { profiles: {} } as any, artifact);

        expect(result.applicable).toBe(false);
        expect(result.refusalReason).toContain('non-authoritative');
    });

    test('refuses application when no suggestions are included', () => {
        const artifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: {},
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [{}] as any, // Only excluded suggestions exist
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = applyEvaluationPolicyPatchArtifact('{"profiles":{"ci":{}}}', { profiles: { ci: {} } } as any, artifact);

        expect(result.applicable).toBe(false);
        expect(result.refusalReason).toContain('No included suggestions');
    });

    test('successfully applies artifact for authoritative target', () => {
        const originalText = `{
    "profiles": {
        "ci": {
            "defaultThreshold": "error"
        }
    }
}`;
        const parsedPolicy: FederationEvaluationPolicyFile = {
            profiles: {
                ci: {
                    defaultThreshold: 'error'
                }
            }
        };

        const artifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: { execution: 'warning' },
            proposedWaivers: [{ code: 'TRUST_02' }],
            includedSuggestions: [{}, {}] as any,
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = applyEvaluationPolicyPatchArtifact(originalText, parsedPolicy, artifact);

        expect(result.applicable).toBe(true);
        expect(result.changesApplied).toBe(true);
        expect(result.changedPaths).toContain('profiles.ci.codeOverrides');
        expect(result.changedPaths).toContain('profiles.ci.categoryOverrides');
        expect(result.changedPaths).toContain('profiles.ci.waivers');
        expect(result.updatedFileText).toContain('"TRUST_01": "info"');
        expect(result.updatedFileText).toContain('"TRUST_02"');
    });

    test('refuses application when AST mutation returns ambiguity', () => {
        const malformedText = `{"profiles": {"ci": {"defaultThreshold": "error"`; // no braces closed
        
        const parsedPolicy: FederationEvaluationPolicyFile = {
            profiles: {
                ci: {
                    defaultThreshold: 'error'
                }
            }
        };

        const artifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [{}] as any,
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = applyEvaluationPolicyPatchArtifact(malformedText, parsedPolicy, artifact);

        expect(result.applicable).toBe(false);
        expect(result.refusalReason).toContain('Cannot locate');
    });
});
