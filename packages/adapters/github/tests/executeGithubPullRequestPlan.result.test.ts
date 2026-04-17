import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { executeGithubPullRequestPlan } from '../src/executeGithubPullRequestPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import type { GithubPullRequestExecutionPlan } from '../src/buildGithubPullRequestPlan.js';

vi.mock('@octokit/rest', () => {
    return {
        Octokit: vi.fn().mockImplementation(() => {
            return {
                rest: {
                    git: {
                        getRef: vi.fn().mockResolvedValue({ data: { object: { sha: 'mock-base-sha' } } }),
                        getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'mock-tree-sha' } } }),
                        createTree: vi.fn().mockResolvedValue({ data: { sha: 'mock-new-tree-sha' } }),
                        createCommit: vi.fn().mockResolvedValue({ data: { sha: 'mock-new-commit-sha' } }),
                        createRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/mock-branch' } }),
                        updateRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/mock-branch' } })
                    },
                    pulls: {
                        create: vi.fn().mockResolvedValue({ data: { html_url: 'https://github.com/mock/pr/1', number: 1 } }),
                        list: vi.fn().mockResolvedValue({ data: [] })
                    }
                }
            };
        })
    };
});

vi.mock('fs', () => {
    return {
        readFileSync: vi.fn().mockReturnValue('{}')
    };
});

describe('Phase 16Z executeGithubPullRequestPlan telemetry', () => {
    const plan: GithubPullRequestExecutionPlan = {
        repository: { repositoryNamespace: 'tharcyn', repositoryName: 'arch-engine' },
        branchName: 'arch-engine/policy-update/ci/mockhash',
        commitMessage: 'Update policy for profile ci',
        pullRequestTitle: 'Update policy (profile: ci)',
        pullRequestBody: 'Summary body',
        targetBaseBranch: 'main',
        changedPaths: ['evaluation-policy.json'],
        authoritative: true,
        integrityHash: 'mock-hash',
        producerIdentity: 'arch-engine@1.0.0',
        payloadSchemaVersion: 'policy-pr-payload.v1'
    };

    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.GITHUB_TOKEN;
        process.env.GITHUB_REPOSITORY = 'tharcyn/arch-engine';
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    test('dry-run execution returns properly structured result', async () => {
        const result = await executeGithubPullRequestPlan(plan);
        expect(result.adapterOutcome).toBe('dry-run');
        expect(result.executionMode).toBe('dry-run');
        expect(result.executionPerformed).toBe(false);
        expect(result.branchCreated).toBe(false);
        expect(result.commitCreated).toBe(false);
        expect(result.pullRequestCreated).toBe(false);
        expect(result.repositoryContextVerified).toBe(true);
        expect(result.refusalReason).toBeUndefined();
    });

    test('missing token refusal returns structured result', async () => {
        const result = await executeGithubPullRequestPlan(plan, { execute: true });
        expect(result.adapterOutcome).toBe('refused');
        expect(result.executionMode).toBe('execute');
        expect(result.executionPerformed).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_GITHUB_TOKEN);
    });

    test('successful live execution returns properly structured metadata', async () => {
        const result = await executeGithubPullRequestPlan(plan, { execute: true, githubToken: 'mock-token' });
        expect(result.adapterOutcome).toBe('pr-created');
        expect(result.executionMode).toBe('execute');
        expect(result.executionPerformed).toBe(true);
        expect(result.branchCreated).toBe(true);
        expect(result.commitCreated).toBe(true);
        expect(result.commitSha).toBe('mock-new-commit-sha');
        expect(result.pullRequestCreated).toBe(true);
        expect(result.pullRequestUrl).toBe('https://github.com/mock/pr/1');
        expect(result.pullRequestNumber).toBe(1);
        expect(result.repositoryContextVerified).toBe(true);
        expect(result.refusalReason).toBeUndefined();
    });

    test('repository mismatch refusal returns structured result', async () => {
        process.env.GITHUB_REPOSITORY = 'other/repo';
        const result = await executeGithubPullRequestPlan(plan, { execute: true, githubToken: 'mock-token' });
        expect(result.adapterOutcome).toBe('refused');
        expect(result.executionMode).toBe('execute');
        expect(result.executionPerformed).toBe(false);
        expect(result.repositoryContextVerified).toBe(false);
        expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);
    });

    test('branch reuse scenario sets branchCreated to false', async () => {
        const { Octokit } = await import('@octokit/rest');
        const octokitInstance = new Octokit();
        octokitInstance.rest.git.createRef = vi.fn().mockRejectedValue({ status: 422 }); // Branch exists
        octokitInstance.rest.git.updateRef = vi.fn().mockResolvedValue({}); // Successfully updated
        octokitInstance.rest.pulls.list = vi.fn().mockResolvedValue({ data: [] });
        octokitInstance.rest.pulls.create = vi.fn().mockResolvedValue({ data: { html_url: 'https://github.com/mock/pr/2', number: 2 } });

        // Remock specifically for this test
        vi.mocked(Octokit).mockImplementationOnce(() => octokitInstance as any);

        const result = await executeGithubPullRequestPlan(plan, { execute: true, githubToken: 'mock-token' });
        expect(result.adapterOutcome).toBe('pr-created');
        expect(result.executionMode).toBe('execute');
        expect(result.executionPerformed).toBe(true);
        expect(result.branchCreated).toBe(false); // Indicates it was reused, not created newly
        expect(result.branchReused).toBe(true);
        expect(result.commitCreated).toBe(true);
        expect(result.pullRequestCreated).toBe(true);
        expect(result.existingPullRequestDetected).toBe(false);
    });

    test('existing PR detected prevents duplicate PR creation', async () => {
        const { Octokit } = await import('@octokit/rest');
        const octokitInstance = new Octokit();
        octokitInstance.rest.git.createRef = vi.fn().mockRejectedValue({ status: 422 }); // Branch exists
        octokitInstance.rest.git.updateRef = vi.fn().mockResolvedValue({}); // Successfully updated
        octokitInstance.rest.pulls.list = vi.fn().mockResolvedValue({ 
            data: [{ number: 99, html_url: 'https://github.com/mock/pr/99' }] 
        });

        // Remock specifically for this test
        vi.mocked(Octokit).mockImplementationOnce(() => octokitInstance as any);

        const result = await executeGithubPullRequestPlan(plan, { execute: true, githubToken: 'mock-token' });
        expect(result.adapterOutcome).toBe('pr-reused');
        expect(result.executionMode).toBe('execute');
        expect(result.executionPerformed).toBe(true);
        expect(result.branchCreated).toBe(false);
        expect(result.branchReused).toBe(true);
        expect(result.commitCreated).toBe(true);
        expect(result.pullRequestCreated).toBe(false); // Should not create new PR
        expect(result.existingPullRequestDetected).toBe(true);
        expect(result.existingPullRequestNumber).toBe(99);
        expect(result.existingPullRequestUrl).toBe('https://github.com/mock/pr/99');
    });
});
