import { describe, expect, test } from 'vitest';
import { exportEvaluationPolicyPatchArtifact } from '../../src/policy/exportEvaluationPolicyPatchArtifact.js';
import type { FederationEvaluationPolicyPatchArtifact } from '../../src/policy/generateEvaluationPolicyPatchArtifact.js';
import type { FederationEvaluationPolicyPatchApplyResult } from '../../src/policy/applyEvaluationPolicyPatchArtifact.js';

describe('Phase 16X exportEvaluationPolicyPatchArtifact', () => {

    test('exports deterministic summary for authoritative patch', () => {
        const patchArtifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            evaluationContextFingerprint: 'ctx-123',
            proposedCodeOverrides: { 'TRUST_01': 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [{} as any, {} as any],
            excludedRiskySuggestions: [{} as any],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated patch'
        };

        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['profiles.ci.codeOverrides'],
            updatedFileText: '{}',
            summaryMessage: 'Applicable'
        };

        const result = exportEvaluationPolicyPatchArtifact(patchArtifact, applyResult, {
            policyFileFingerprint: 'file-123'
        });

        expect(result.authoritative).toBe(true);
        expect(result.includedSuggestions.length).toBe(2);
        expect(result.excludedRiskySuggestions.length).toBe(1);
        expect(result.excludedNonAuthoritativeSuggestions.length).toBe(0);
        expect(Object.keys(result.proposedCodeOverrides).length).toBe(1);
        
        expect(result.machineReadableSummary).toContain('Exported authoritative patch preview');
        expect(result.markdownSummary).toContain('**Authoritative:** ✅ Yes');
        expect(result.markdownSummary).toContain('**Code Overrides:**');
        expect(result.markdownSummary).toContain('*Context Fingerprint:* `ctx-123`');
        expect(result.markdownSummary).toContain('*Policy File Fingerprint:* `file-123`');
        expect(result.updatedFileTextPreview).toBe('{}');
        
        expect(result.exportArtifactProducerIdentity).toContain('arch-engine@');
        expect(result.exportArtifactSchemaVersion).toBe('policy-patch-export.v1');
        expect(result.exportArtifactIntegrityHash).toBeDefined();
        expect(result.markdownSummary).toContain('Produced by: `arch-engine@');
    });

    test('exports scaffold warning for non-authoritative patch', () => {
        const patchArtifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'default',
            targetProfileSource: 'synthetic-fallback',
            targetProfileAuthoritative: false,
            proposedCodeOverrides: {},
            proposedCategoryOverrides: { 'security': 'warning' },
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [{} as any],
            summaryMessage: 'Scaffold patch'
        };

        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: false,
            targetProfileSource: 'synthetic-fallback',
            targetProfileAuthoritative: false,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'Target profile is not authoritative',
            summaryMessage: 'Not applicable'
        };

        const result = exportEvaluationPolicyPatchArtifact(patchArtifact, applyResult);

        expect(result.authoritative).toBe(false);
        expect(result.excludedNonAuthoritativeSuggestions.length).toBe(1);
        expect(Object.keys(result.proposedCategoryOverrides).length).toBe(1);

        expect(result.machineReadableSummary).toContain('Exported scaffold patch preview');
        expect(result.markdownSummary).toContain('**Authoritative:** ❌ No');
        expect(result.markdownSummary).toContain('> [!WARNING]');
        expect(result.markdownSummary).toContain('This patch is non-authoritative');
    });

    test('includes repository hint when available', () => {
        const patchArtifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            evaluationContextFingerprint: 'ctx-123',
            proposedCodeOverrides: { 'TRUST_01': 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated patch'
        };

        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['profiles.ci.codeOverrides'],
            updatedFileText: '{}',
            summaryMessage: 'Applicable'
        };

        process.env.ARCH_ENGINE_REPOSITORY_HINT = 'test-org/test-repo';
        try {
            const result = exportEvaluationPolicyPatchArtifact(patchArtifact, applyResult);
            expect(result.exportArtifactRepositoryHint).toBe('test-org/test-repo');
            expect(result.exportArtifactRepositoryHintSource).toBe('env');
            expect(result.markdownSummary).toContain('Repository: `test-org/test-repo`');
            expect(result.markdownSummary).toContain('Repository source: `env`');
            expect(result.markdownSummary).not.toContain('derived from `package.json`');
        } finally {
            delete process.env.ARCH_ENGINE_REPOSITORY_HINT;
        }
    });

    test('includes warning when repository hint falls back to package.json', () => {
        const patchArtifact: FederationEvaluationPolicyPatchArtifact = {
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: {},
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated patch'
        };
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: [],
            updatedFileText: '{}',
            summaryMessage: 'Applicable'
        };

        const result = exportEvaluationPolicyPatchArtifact(patchArtifact, applyResult);
        expect(result.exportArtifactRepositoryHintSource).toBe('package-json');
        expect(result.markdownSummary).toContain('Repository source: `package-json`');
        expect(result.markdownSummary).toContain('> Repository identity derived from `package.json` name.');
    });

});
