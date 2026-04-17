import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { lintFindingsCommand } from '../src/lintFindingsCommand.js';
import * as core from '@arch-engine/core';

vi.mock('fs');
vi.mock('@arch-engine/core', () => {
    return {
        loadTopologyDataset: vi.fn(),
        loadPolicyPack: vi.fn(),
        assessFederationExecutionPreflight: vi.fn(),
        materializeFederationExecutionPlan: vi.fn(),
        runFederationEvaluationPlan: vi.fn(),
        lintFederationFindingRegistry: vi.fn()
    };
});

describe('Phase 16S lintFindingsCommand', () => {
    let consoleLogMock: any;
    let consoleErrorMock: any;
    let processExitMock: any;

    beforeEach(() => {
        consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitMock = vi.spyOn(process, 'exit').mockImplementation((code: any) => {
            throw new Error(`Process.exit(${code}) called`);
        });

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{}');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('calls core lint routine and prints human readable output', async () => {
        vi.mocked(core.loadTopologyDataset).mockReturnValue({} as any);
        vi.mocked(core.loadPolicyPack).mockReturnValue({} as any);
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.materializeFederationExecutionPlan).mockReturnValue({} as any);
        vi.mocked(core.runFederationEvaluationPlan).mockReturnValue({} as any);
        vi.mocked(core.lintFederationFindingRegistry).mockReturnValue({
            totalIssues: 1,
            issuesBySeverity: { warning: 0, error: 1 },
            issuesByType: { CORE_PREFIX_IMPERSONATION: 1 } as any,
            issues: [
                {
                    issueType: 'CORE_PREFIX_IMPERSONATION',
                    code: 'INVALID_PREFIX_ARCH_TEST',
                    category: 'trust',
                    packName: 'pack-a',
                    summaryMessage: 'impersonation',
                    severity: 'error'
                }
            ],
            summaryMessage: 'Found 1 registry issue(s): 1 error(s), 0 warning(s).'
        } as any);

        await expect(lintFindingsCommand(['-t', 'topo.json', '-p', 'packA'])).rejects.toThrow('Process.exit(1) called');

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Found 1 registry issue(s)'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('[ERROR] CORE_PREFIX_IMPERSONATION'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Code: INVALID_PREFIX_ARCH_TEST'));
    });

    test('outputs json when --json is provided and exits with code 1 if errors', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.lintFederationFindingRegistry).mockReturnValue({
            totalIssues: 1,
            issuesBySeverity: { warning: 0, error: 1 },
            summaryMessage: 'Found 1 issue',
            issues: []
        } as any);

        await expect(lintFindingsCommand(['--json'])).rejects.toThrow('Process.exit(1) called');
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"summaryMessage": "Found 1 issue"'));
    });

    test('rejects preflight', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: false } as any);

        await expect(lintFindingsCommand([])).rejects.toThrow('Process.exit(1) called');
        expect(consoleErrorMock).toHaveBeenCalledWith('Preflight rejected.');
    });
});
