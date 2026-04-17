import { describe, test, expect } from 'vitest';
import { buildGitlabMergeRequestPlan } from '../src/buildGitlabMergeRequestPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';
import { buildShortIntegritySuffix } from '@arch-engine/adapter-shared';

describe('buildGitlabMergeRequestPlan', () => {
    const basePayload = {
        pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
        exportArtifactSchemaVersion: 'export.v1',
        exportArtifactProducerIdentity: 'arch-engine@1.0.0',
        exportArtifactIntegrityHash: 'mock-hash',
        targetProfile: 'ci',
        targetProfileSource: 'cli' as const,
        suggestedTitle: 'Mock PR',
        suggestedCommitMessage: 'Mock commit',
        suggestedBodyMarkdown: 'Mock body',
        changedPaths: [],
        evaluationContextFingerprint: 'mock-context-fingerprint',
        policyFileFingerprint: 'mock-policy-fingerprint',
        authoritative: true,
        repositoryHint: 'group/project',
        repositoryHintSource: 'env' as const,
        disclaimerFlags: {
            repositoryHintDerivedFromPackageJson: false,
            nonAuthoritativePatch: false
        }
    };

    test('refuses schema mismatch', () => {
        const result = buildGitlabMergeRequestPlan({
            ...basePayload,
            pullRequestPayloadSchemaVersion: 'invalid.version'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.SCHEMA_MISMATCH);
        }
    });

    test('refuses missing integrity hash', () => {
        const result = buildGitlabMergeRequestPlan({
            ...basePayload,
            exportArtifactIntegrityHash: '   '
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_INTEGRITY_HASH);
        }
    });

    test('generates deterministic branch naming', () => {
        const result = buildGitlabMergeRequestPlan(basePayload);
        expect(result.success).toBe(true);
        if (result.success) {
            const shortHash = buildShortIntegritySuffix('mock-hash');
            expect(result.plan.branchName).toBe(`arch-engine/policy-update/ci/${shortHash}`);
        }
    });

    test('propagates advisory flag', () => {
        const result = buildGitlabMergeRequestPlan({
            ...basePayload,
            repositoryHintSource: 'package-json',
            authoritative: false
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.plan.repositoryIdentityAdvisory).toBe(true);
        }
    });
});
