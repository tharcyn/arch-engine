import { describe, expect, test } from 'vitest';
import { verifyGithubRuntimeRepositoryContext } from '../src/verifyGithubRuntimeRepositoryContext.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { GithubPullRequestExecutionPlan } from '../src/buildGithubPullRequestPlan.js';

describe('Phase 16Z hardening - verifyGithubRuntimeRepositoryContext', () => {
    const basePlan: GithubPullRequestExecutionPlan = {
        repository: { repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' },
        branchName: 'branch',
        commitMessage: 'msg',
        pullRequestTitle: 'title',
        pullRequestBody: 'body',
        targetBaseBranch: 'main',
        changedPaths: [],
        authoritative: true,
        integrityHash: 'hash',
        producerIdentity: 'prod',
        payloadSchemaVersion: 'v1'
    };

    test('Case 1: runtime repo matches payload repo -> verification passes', () => {
        const result = verifyGithubRuntimeRepositoryContext(basePlan, { GITHUB_REPOSITORY: 'tharcyn/arch-engine' }, false);
        expect(result.repositoryContextVerified).toBe(true);
        expect(result.runtimeRepository).toBe('tharcyn/arch-engine');
        expect(result.refusalReason).toBeUndefined();
    });

    test('Case 2: runtime repo mismatches strong env-derived payload repo -> execution refused', () => {
        const plan = { ...basePlan, repositoryIdentityAdvisory: false };
        const result = verifyGithubRuntimeRepositoryContext(plan, { GITHUB_REPOSITORY: 'other/arch-engine' }, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);
    });

    test('Case 3: runtime repo mismatches weak payload repo in dry-run -> advisory surfaced', () => {
        const plan = { ...basePlan, repositoryIdentityAdvisory: true };
        const result = verifyGithubRuntimeRepositoryContext(plan, { GITHUB_REPOSITORY: 'other/arch-engine' }, true);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBeUndefined(); // Important: no hard refusal in dry-run
        expect(result.advisory).toContain('advisory-only in dry-run');
    });

    test('Case 3b: runtime repo mismatches weak payload repo in live execution -> execution refused', () => {
        const plan = { ...basePlan, repositoryIdentityAdvisory: true };
        const result = verifyGithubRuntimeRepositoryContext(plan, { GITHUB_REPOSITORY: 'other/arch-engine' }, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);
        expect(result.advisory).toBeUndefined();
    });

    test('Case 4: GITHUB_REPOSITORY missing -> unverified but no hard refusal', () => {
        const result = verifyGithubRuntimeRepositoryContext(basePlan, {}, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBeUndefined(); // no mismatch, just missing
        expect(result.advisory).toContain('not found in environment');
    });

    test('Case 5: normalization equivalence -> verification passes', () => {
        // payload has `tharcyn/arch-engine`, runtime has `github.com/tharcyn/arch-engine`
        const result = verifyGithubRuntimeRepositoryContext(basePlan, { GITHUB_REPOSITORY: 'github.com/tharcyn/arch-engine' }, false);
        expect(result.repositoryContextVerified).toBe(true);
        expect(result.runtimeRepository).toBe('github.com/tharcyn/arch-engine');
    });

    test('Case 5b: case insensitive equivalence -> verification passes', () => {
        const result = verifyGithubRuntimeRepositoryContext(basePlan, { GITHUB_REPOSITORY: 'THARCYN/ARCH-ENGINE' }, false);
        expect(result.repositoryContextVerified).toBe(true);
    });

    test('Malformed GITHUB_REPOSITORY -> returns unverified with advisory', () => {
        const result = verifyGithubRuntimeRepositoryContext(basePlan, { GITHUB_REPOSITORY: 'just-org' }, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.advisory).toContain('malformed');
        expect(result.refusalReason).toBeUndefined();
    });
});
