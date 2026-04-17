import { describe, expect, test } from 'vitest';
import { buildPolicyPatchPullRequestPayload } from '../../src/policy/buildPolicyPatchPullRequestPayload.js';
import { POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '../../src/policy/constants.js';
import type { FederationEvaluationPolicyPatchExport } from '../../src/policy/exportEvaluationPolicyPatchArtifact.js';

describe('Phase 16Y buildPolicyPatchPullRequestPayload', () => {

    const baseExport: FederationEvaluationPolicyPatchExport = {
        targetProfile: 'ci',
        targetProfileSource: 'cli-selected',
        authoritative: true,
        changedPaths: ['profiles.ci.codeOverrides'],
        includedSuggestions: [],
        excludedRiskySuggestions: [],
        excludedNonAuthoritativeSuggestions: [],
        proposedCodeOverrides: {},
        proposedCategoryOverrides: {},
        proposedWaivers: [],
        markdownSummary: '## Policy Patch Export\n\nSome summary text.',
        machineReadableSummary: 'Exported authoritative patch preview.',
        exportArtifactProducerIdentity: 'arch-engine@1.0.0',
        exportArtifactSchemaVersion: 'policy-patch-export.v1',
        exportArtifactRepositoryHint: 'org/repo',
        exportArtifactRepositoryHintSource: 'env',
        exportArtifactIntegrityHash: 'mock-hash',
        evaluationContextFingerprint: 'mock-context-hash',
        policyFileFingerprint: 'mock-file-hash'
    };

    test('generates authoritative payload deterministically', () => {
        const payload = buildPolicyPatchPullRequestPayload(baseExport);

        expect(payload.suggestedTitle).toBe('arch-engine: update evaluation policy (profile: ci)');
        expect(payload.suggestedCommitMessage).toBe('arch-engine: update evaluation policy for profile ci');
        expect(payload.suggestedBodyMarkdown).toBe(baseExport.markdownSummary);
        
        expect(payload.pullRequestPayloadSchemaVersion).toBe(POLICY_PR_PAYLOAD_SCHEMA_VERSION);
        expect(payload.pullRequestPayloadSchemaVersion).toBe('policy-pr-payload.v1');
        
        expect(payload.authoritative).toBe(true);
        expect(payload.disclaimerFlags.nonAuthoritativePatch).toBe(false);
        expect(payload.disclaimerFlags.repositoryHintDerivedFromPackageJson).toBe(false);

        // Passthrough fields check
        expect(payload.exportArtifactIntegrityHash).toBe('mock-hash');
        expect(payload.evaluationContextFingerprint).toBe('mock-context-hash');
        expect(payload.repositoryHint).toBe('org/repo');
        expect(payload.repositoryHintSource).toBe('env');
    });

    test('generates non-authoritative payload deterministically', () => {
        const payload = buildPolicyPatchPullRequestPayload({
            ...baseExport,
            authoritative: false,
            targetProfile: 'default',
            targetProfileSource: 'synthetic-fallback'
        });

        expect(payload.suggestedTitle).toBe('arch-engine: update evaluation policy (profile: default)');
        expect(payload.suggestedCommitMessage).toBe('arch-engine: update evaluation policy for profile default');
        
        expect(payload.authoritative).toBe(false);
        expect(payload.disclaimerFlags.nonAuthoritativePatch).toBe(true);
    });

    test('appends advisory note when repository identity is from package-json', () => {
        const exportObj: FederationEvaluationPolicyPatchExport = {
            ...baseExport,
            exportArtifactRepositoryHintSource: 'package-json',
            markdownSummary: '## Summary\nAlready has something.'
        };
        
        const payload = buildPolicyPatchPullRequestPayload(exportObj);

        expect(payload.disclaimerFlags.repositoryHintDerivedFromPackageJson).toBe(true);
        expect(payload.suggestedBodyMarkdown).toContain('best-effort hint for automation workflows');
        expect(payload.suggestedBodyMarkdown).toContain('ARCH_ENGINE_REPOSITORY_HINT');
    });

    test('does not double-append advisory note if already present', () => {
        const exportObj: FederationEvaluationPolicyPatchExport = {
            ...baseExport,
            exportArtifactRepositoryHintSource: 'package-json',
            markdownSummary: '## Summary\nbest-effort hint for automation workflows already exists.'
        };
        
        const payload = buildPolicyPatchPullRequestPayload(exportObj);

        // The text is present once from the markdownSummary, but we should verify our exact WARNING block isn't appended.
        expect(payload.suggestedBodyMarkdown).not.toContain('> **PR Automation Advisory:** This repository identity');
    });

    test('falls back to "unknown" profile if missing', () => {
        const exportObj: FederationEvaluationPolicyPatchExport = {
            ...baseExport,
            targetProfile: undefined
        };
        
        const payload = buildPolicyPatchPullRequestPayload(exportObj);

        expect(payload.suggestedTitle).toBe('arch-engine: update evaluation policy (profile: unknown)');
        expect(payload.suggestedCommitMessage).toBe('arch-engine: update evaluation policy for profile unknown');
    });

});
