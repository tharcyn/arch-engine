import { describe, test, expect } from 'vitest';
import { mutateEvaluationPolicyFileAst } from '../../src/policy/mutateEvaluationPolicyFileAst';
import type { FederationEvaluationPolicyFile } from '../../src/policy/validateEvaluationPolicyFile';
import type { FederationEvaluationPolicyPatchArtifact } from '../../src/policy/generateEvaluationPolicyPatchArtifact';

describe('Phase 16U mutateEvaluationPolicyFileAst', () => {

    test('inserts codeOverrides and categoryOverrides deterministically', () => {
        const originalText = `{
    // Global comments
    "defaultProfile": "ci",
    "profiles": {
        "ci": {
            "defaultThreshold": "error"
        }
    }
}`;

        const parsedPolicy: FederationEvaluationPolicyFile = {
            defaultProfile: 'ci',
            profiles: {
                ci: {
                    defaultThreshold: 'error'
                }
            }
        };

        const patch: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info', ALPHA_01: 'none' },
            proposedCategoryOverrides: { trust: 'info' },
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = mutateEvaluationPolicyFileAst(originalText, parsedPolicy, patch);

        expect(result.mutationApplied).toBe(true);
        expect(result.changedPaths).toContain('profiles.ci.codeOverrides');
        expect(result.changedPaths).toContain('profiles.ci.categoryOverrides');
        
        // Assert sorting and formatting
        expect(result.updatedFileText).toContain('"ALPHA_01": "none"');
        expect(result.updatedFileText).toContain('"TRUST_01": "info"');
        
        // Assert comment preservation
        expect(result.updatedFileText).toContain('// Global comments');
        
        // Verify output is valid JSON if we strip the comments
        const cleanJson = result.updatedFileText.replace('// Global comments', '');
        const reParsed = JSON.parse(cleanJson);
        expect(reParsed.profiles.ci.codeOverrides.TRUST_01).toBe('info');
    });

    test('replaces existing codeOverrides subtrees without breaking surrounding elements', () => {
        const originalText = `{
    "profiles": {
        "ci": {
            "defaultThreshold": "error",
            "codeOverrides": {
                "BETA_01": "warning"
            },
            /* another comment */
            "extends": "base"
        }
    }
}`;

        const parsedPolicy: FederationEvaluationPolicyFile = {
            profiles: {
                ci: {
                    defaultThreshold: 'error',
                    codeOverrides: { BETA_01: 'warning' },
                    extends: 'base'
                }
            }
        };

        const patch: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = mutateEvaluationPolicyFileAst(originalText, parsedPolicy, patch);

        expect(result.mutationApplied).toBe(true);
        expect(result.updatedFileText).toContain('"TRUST_01": "info"');
        expect(result.updatedFileText).toContain('"BETA_01": "warning"');
        expect(result.updatedFileText).toContain('/* another comment */');
    });

    test('refuses mutation for non-authoritative profiles', () => {
        const result = mutateEvaluationPolicyFileAst('{}', {} as any, {
            targetProfile: 'default',
            targetProfileSource: 'synthetic-fallback',
            targetProfileAuthoritative: false,
            proposedCodeOverrides: { A: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        });

        expect(result.mutationApplied).toBe(false);
        expect(result.refusalReason).toContain('non-authoritative');
    });

    test('refuses mutation for missing profiles', () => {
        const result = mutateEvaluationPolicyFileAst('{"profiles": {}}', { profiles: {} } as any, {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { A: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        });

        expect(result.mutationApplied).toBe(false);
        expect(result.refusalReason).toContain('missing from profiles root');
    });

    test('ignores braces inside strings and comments', () => {
        const originalText = `{
    // } a fake closing brace in line comment
    "profiles": {
        "ci": {
            "defaultThreshold": "error",
            "fakeBlock": "this has a { brace and } another one \\"escaped\\" !",
            /*
              }
              block comment brace
            */
            "codeOverrides": {
                "BETA_01": "warning"
            }
        }
    }
}`;

        const parsedPolicy: FederationEvaluationPolicyFile = {
            profiles: {
                ci: {
                    defaultThreshold: 'error',
                    codeOverrides: { BETA_01: 'warning' }
                }
            }
        };

        const patch: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = mutateEvaluationPolicyFileAst(originalText, parsedPolicy, patch);

        expect(result.mutationApplied).toBe(true);
        expect(result.updatedFileText).toContain('"TRUST_01": "info"');
        expect(result.updatedFileText).toContain('} a fake closing brace');
        expect(result.updatedFileText).toContain('this has a { brace');
        expect(result.updatedFileText).toContain('block comment brace');
    });

    test('refuses mutation when structural boundaries are malformed or ambiguous', () => {
        // If the json is completely malformed and missing a closing brace, 
        // the scanBalancedObjectBlock should return success: false
        const malformedText = `{
    "profiles": {
        "ci": {
            "defaultThreshold": "error"
        // missing closing braces
`;
        
        const parsedPolicy: FederationEvaluationPolicyFile = {
            profiles: {
                ci: {
                    defaultThreshold: 'error'
                }
            }
        };

        const patch: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: ''
        };

        const result = mutateEvaluationPolicyFileAst(malformedText, parsedPolicy, patch);
        expect(result.mutationApplied).toBe(false);
        expect(result.refusalReason).toContain('Cannot locate "profiles" block');
    });
});
