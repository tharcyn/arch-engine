import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { gitlabCreatePolicyMrCommand } from '../../../cli/src/gitlabCreatePolicyMrCommand.js';
import { buildGitlabMergeRequestPlan, executeGitlabMergeRequestPlan } from '@arch-engine/adapter-gitlab';

vi.mock('fs', async () => {
    const actual = await vi.importActual('fs') as any;
    return {
        ...actual,
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
    };
});

vi.mock('@arch-engine/adapter-gitlab', () => {
    return {
        buildGitlabMergeRequestPlan: vi.fn(),
        executeGitlabMergeRequestPlan: vi.fn()
    };
});

describe('Gitlab CLI - create-policy-mr', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        mockExit.mockClear();
        mockLog.mockClear();
        mockError.mockClear();
    });

    test('supports file input and dry-run by default', async () => {
        const payloadJson = JSON.stringify({
            pullRequestPayloadSchemaVersion: '1.0.0'
        });
        
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue(payloadJson);
        
        (buildGitlabMergeRequestPlan as any).mockReturnValue({
            success: true,
            plan: { branchName: 'mock-branch' }
        });
        
        (executeGitlabMergeRequestPlan as any).mockResolvedValue({
            executionMode: 'dry-run',
            adapterOutcome: 'dry-run',
            repositoryContextVerified: true,
            branchName: 'mock-branch'
        });

        await gitlabCreatePolicyMrCommand(['mock-file.json']);

        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('mock-file.json'), 'utf8');
        expect(buildGitlabMergeRequestPlan).toHaveBeenCalled();
        expect(executeGitlabMergeRequestPlan).toHaveBeenCalledWith({ branchName: 'mock-branch' }, { execute: false });
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
    });

    test('supports stdin JSON consumption', async () => {
        const payloadJson = JSON.stringify({
            pullRequestPayloadSchemaVersion: '1.0.0'
        });
        
        // 0 is stdin descriptor
        (fs.readFileSync as any).mockImplementation((path: any) => {
            if (path === 0) return payloadJson;
            return '{}';
        });
        
        (buildGitlabMergeRequestPlan as any).mockReturnValue({
            success: true,
            plan: { branchName: 'mock-branch' }
        });
        
        (executeGitlabMergeRequestPlan as any).mockResolvedValue({
            executionMode: 'dry-run',
            adapterOutcome: 'dry-run',
            repositoryContextVerified: true,
            branchName: 'mock-branch'
        });

        await gitlabCreatePolicyMrCommand([]);

        expect(fs.readFileSync).toHaveBeenCalledWith(0, 'utf-8');
        expect(buildGitlabMergeRequestPlan).toHaveBeenCalled();
    });

    test('supports --json-output-plan parity', async () => {
        const payloadJson = JSON.stringify({});
        
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue(payloadJson);
        
        (buildGitlabMergeRequestPlan as any).mockReturnValue({
            success: true,
            plan: { branchName: 'mock-branch-json' }
        });
        
        await gitlabCreatePolicyMrCommand(['mock-file.json', '--json-output-plan']);

        expect(mockLog).toHaveBeenCalledWith(JSON.stringify({ branchName: 'mock-branch-json' }, null, 2));
        // Should not execute if only asking for plan without execute
        expect(executeGitlabMergeRequestPlan).not.toHaveBeenCalled();
    });

    test('supports --execute flag', async () => {
        const payloadJson = JSON.stringify({});
        
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue(payloadJson);
        
        (buildGitlabMergeRequestPlan as any).mockReturnValue({
            success: true,
            plan: { branchName: 'mock-branch' }
        });
        
        (executeGitlabMergeRequestPlan as any).mockResolvedValue({
            executionMode: 'execute',
            adapterOutcome: 'pr-created',
            repositoryContextVerified: true,
            branchName: 'mock-branch',
            branchCreated: true,
            commitCreated: true,
            pullRequestCreated: true,
            pullRequestNumber: 42,
            pullRequestUrl: 'https://gitlab.com/mock/mr/42'
        });

        await gitlabCreatePolicyMrCommand(['mock-file.json', '--execute']);

        expect(executeGitlabMergeRequestPlan).toHaveBeenCalledWith({ branchName: 'mock-branch' }, { execute: true });
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Branch created: true'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('New MR number: 42'));
    });
});
