import { describe, expect, test } from 'vitest';
import { buildGithubPullRequestPlan, parseGithubRepositoryHint } from '../src/buildGithubPullRequestPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

describe('Phase 16Z parseGithubRepositoryHint', () => {
    test('parses standard org/repo', () => {
        expect(parseGithubRepositoryHint('tharcyn/arch-engine')).toEqual({ repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' });
    });

    test('parses github.com/org/repo', () => {
        expect(parseGithubRepositoryHint('github.com/tharcyn/arch-engine')).toEqual({ repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' });
    });

    test('parses https://github.com/org/repo', () => {
        expect(parseGithubRepositoryHint('https://github.com/tharcyn/arch-engine')).toEqual({ repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' });
    });

    test('parses git@github.com:org/repo', () => {
        expect(parseGithubRepositoryHint('git@github.com:tharcyn/arch-engine')).toEqual({ repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' });
    });

    test('strips .git suffix', () => {
        expect(parseGithubRepositoryHint('https://github.com/tharcyn/arch-engine.git')).toEqual({ repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' });
    });

    test('returns null on invalid hints', () => {
        expect(parseGithubRepositoryHint('')).toBeNull();
        expect(parseGithubRepositoryHint('foo')).toBeNull();
        expect(parseGithubRepositoryHint('foo/')).toBeNull();
    });
});

describe('Phase 16Z buildGithubPullRequestPlan', () => {
    const basePayload: FederationEvaluationPolicyPullRequestPayload = {
        pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
        suggestedTitle: 'Update policy (profile: ci)',
        suggestedCommitMessage: 'Update policy for profile ci',
        suggestedBodyMarkdown: 'Summary body',
        repositoryHint: 'tharcyn/arch-engine',
        repositoryHintSource: 'env',
        targetProfile: 'ci',
        targetProfileSource: 'cli-selected',
        authoritative: true,
        changedPaths: ['evaluation-policy.json'],
        exportArtifactIntegrityHash: 'mock-hash',
        exportArtifactProducerIdentity: 'arch-engine@1.0.0',
        exportArtifactSchemaVersion: 'policy-patch-export.v1',
        disclaimerFlags: { repositoryHintDerivedFromPackageJson: false, nonAuthoritativePatch: false }
    };

    test('builds valid execution plan deterministically', () => {
        const result = buildGithubPullRequestPlan(basePayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.plan.repository.repositoryNamespace).toBe('tharcyn');
            expect(result.plan.repository.repositoryName).toBe('arch-engine');
            expect(result.plan.branchName).toBe('arch-engine/policy-update/ci/mock-ha');
            expect(result.plan.commitMessage).toBe('Update policy for profile ci');
            expect(result.plan.pullRequestTitle).toBe('Update policy (profile: ci)');
            expect(result.plan.pullRequestBody).toBe('Summary body');
            expect(result.plan.targetBaseBranch).toBe('main'); // DEFAULT_BASE_BRANCH
            expect(result.plan.changedPaths).toEqual(['evaluation-policy.json']);
            expect(result.plan.authoritative).toBe(true);
            expect(result.plan.integrityHash).toBe('mock-hash');
            expect(result.plan.producerIdentity).toBe('arch-engine@1.0.0');
            expect(result.plan.payloadSchemaVersion).toBe(POLICY_PR_PAYLOAD_SCHEMA_VERSION);
            expect(result.plan.repositoryIdentityAdvisory).toBe(false);
        }
    });

    test('adds advisory flag if repositoryHintSource is package-json', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            repositoryHintSource: 'package-json'
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.plan.repositoryIdentityAdvisory).toBe(true);
        }
    });

    test('refuses build if schema version mismatches', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            pullRequestPayloadSchemaVersion: 'invalid-schema'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.SCHEMA_MISMATCH);
        }
    });

    test('refuses build if repository hint is missing', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            repositoryHint: undefined
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_REPOSITORY_HINT);
        }
    });

    test('refuses build if repository hint is malformed', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            repositoryHint: 'just-an-org'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.MALFORMED_REPOSITORY_HINT);
        }
    });

    test('refuses build if integrity hash is missing', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            exportArtifactIntegrityHash: undefined as any
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_INTEGRITY_HASH);
        }
    });

    test('refuses build if integrity hash is empty string', () => {
        const result = buildGithubPullRequestPlan({
            ...basePayload,
            exportArtifactIntegrityHash: '   '
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_INTEGRITY_HASH);
        }
    });

    test('different targetProfiles produce different branch names', () => {
        const result1 = buildGithubPullRequestPlan(basePayload);
        const result2 = buildGithubPullRequestPlan({ ...basePayload, targetProfile: 'staging' });
        
        expect((result1 as any).plan.branchName).not.toBe((result2 as any).plan.branchName);
        expect((result2 as any).plan.branchName).toBe('arch-engine/policy-update/staging/mock-ha');
    });

    test('different integrity hashes produce different branch names', () => {
        const result1 = buildGithubPullRequestPlan(basePayload);
        const result2 = buildGithubPullRequestPlan({ ...basePayload, exportArtifactIntegrityHash: 'different-hash' });
        
        expect((result1 as any).plan.branchName).not.toBe((result2 as any).plan.branchName);
        expect((result2 as any).plan.branchName).toBe('arch-engine/policy-update/ci/differe');
    });
});
