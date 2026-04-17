import { describe, test, expect } from 'vitest';
import { verifyGitlabRuntimeRepositoryContext } from '../src/verifyGitlabRuntimeRepositoryContext.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';

describe('verifyGitlabRuntimeRepositoryContext', () => {
    const mockPlan = {
        repository: { repositoryNamespace: 'group/subgroup', repositoryName: 'project' },
        repositoryIdentityAdvisory: false
    } as any;

    test('strong match passes', () => {
        const result = verifyGitlabRuntimeRepositoryContext(mockPlan, { CI_PROJECT_PATH: 'group/subgroup/project' }, false);
        expect(result.repositoryContextVerified).toBe(true);
    });

    test('strong mismatch refuses', () => {
        const result = verifyGitlabRuntimeRepositoryContext(mockPlan, { CI_PROJECT_PATH: 'other/project' }, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);
    });

    test('weak mismatch advisory allowed in dry-run', () => {
        const result = verifyGitlabRuntimeRepositoryContext({ ...mockPlan, repositoryIdentityAdvisory: true }, { CI_PROJECT_PATH: 'other/project' }, true);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBeUndefined();
        expect(result.advisory).toContain('advisory-only in dry-run');
    });

    test('weak mismatch execute refused', () => {
        const result = verifyGitlabRuntimeRepositoryContext({ ...mockPlan, repositoryIdentityAdvisory: true }, { CI_PROJECT_PATH: 'other/project' }, false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);
    });

    test('nested group normalization parity', () => {
        const nestedPlan = {
            repository: { repositoryNamespace: 'A/B/C', repositoryName: 'D' }
        } as any;
        const result = verifyGitlabRuntimeRepositoryContext(nestedPlan, { CI_PROJECT_PATH: 'a/b/c/d' }, false);
        expect(result.repositoryContextVerified).toBe(true);
    });
});
