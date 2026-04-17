import { vi, beforeEach, afterEach } from 'vitest';
import { runAdapterConformanceSuite } from '@arch-engine/adapter-conformance';
import { buildGitlabMergeRequestPlan } from '../src/buildGitlabMergeRequestPlan.js';
import { executeGitlabMergeRequestPlan } from '../src/executeGitlabMergeRequestPlan.js';

vi.mock('@gitbeaker/rest', () => {
    return {
        Gitlab: vi.fn().mockImplementation(() => {
            return {
                Branches: {
                    show: vi.fn().mockResolvedValue({ name: 'mock-branch' })
                },
                Commits: {
                    create: vi.fn().mockResolvedValue({ id: 'mock-commit-sha' })
                },
                MergeRequests: {
                    all: vi.fn().mockResolvedValue([]),
                    create: vi.fn().mockResolvedValue({ iid: 1, web_url: 'https://gitlab.com/mock/mr/1' })
                }
            };
        })
    };
});

vi.mock('fs', () => {
    return {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('{}')
    };
});

const originalEnv = process.env;

beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GITLAB_TOKEN = 'mock-token';
});

afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
});

runAdapterConformanceSuite({
    adapterName: 'gitlab',
    supportsRepositoryVerification: true,
    supportsDuplicatePullRequestDetection: true,
    supportsSchemaCompatibilityValidation: true,
    buildExecutionPlan: buildGitlabMergeRequestPlan,
    executePlan: executeGitlabMergeRequestPlan
});
