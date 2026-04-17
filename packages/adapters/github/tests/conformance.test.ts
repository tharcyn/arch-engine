import { vi, beforeEach, afterEach } from 'vitest';
import { runAdapterConformanceSuite } from '@arch-engine/adapter-conformance';
import { buildGithubPullRequestPlan } from '../src/buildGithubPullRequestPlan.js';
import { executeGithubPullRequestPlan } from '../src/executeGithubPullRequestPlan.js';

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

const originalEnv = process.env;

beforeEach(() => {
    process.env = { ...originalEnv };
    // Supply a mock token to allow execute operations to pass the token check
    process.env.GITHUB_TOKEN = 'mock-token';
});

afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
});

runAdapterConformanceSuite({
    adapterName: 'github',
    supportsRepositoryVerification: true,
    supportsDuplicatePullRequestDetection: true,
    supportsSchemaCompatibilityValidation: true,
    buildExecutionPlan: buildGithubPullRequestPlan,
    executePlan: executeGithubPullRequestPlan
});
