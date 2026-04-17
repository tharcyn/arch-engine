import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { inspectFindingsCommand } from '../src/inspectFindingsCommand.js';
import * as core from '@arch-engine/core';

vi.mock('fs');
vi.mock('@arch-engine/core', () => {
    return {
        loadTopologyDataset: vi.fn(),
        loadPolicyPack: vi.fn(),
        assessFederationExecutionPreflight: vi.fn(),
        materializeFederationExecutionPlan: vi.fn(),
        runFederationEvaluationPlan: vi.fn(),
        inspectFederationEvaluationFindings: vi.fn()
    };
});

describe('Phase 16Q inspectFindingsCommand', () => {
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

    test('calls core inspect routine and prints human readable output', async () => {
        vi.mocked(core.loadTopologyDataset).mockReturnValue({} as any);
        vi.mocked(core.loadPolicyPack).mockReturnValue({} as any);
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.materializeFederationExecutionPlan).mockReturnValue({} as any);
        vi.mocked(core.runFederationEvaluationPlan).mockReturnValue({} as any);
        vi.mocked(core.inspectFederationEvaluationFindings).mockReturnValue({
            reservedCoreCodePrefix: 'ARCH_',
            totalFindings: 10,
            codesObserved: 5,
            coreReservedCodesObserved: 2,
            packLocalCodesObserved: 3,
            taxonomyRepairedCount: 1,
            taxonomyRepairedCodes: [],
            countsByCode: {},
            countsByCategory: {},
            countsBySeverity: { info: 0, warning: 5, error: 5 },
            codeSummaries: [
                {
                    code: 'ARCH_TEST',
                    category: 'trust',
                    coreReserved: true,
                    taxonomyRepairedObserved: false,
                    countsBySeverity: { info: 0, warning: 1, error: 0 },
                    observedPacks: ['pack-a']
                }
            ]
        } as any);

        await inspectFindingsCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith('Findings observed: 10');
        expect(consoleLogMock).toHaveBeenCalledWith('Codes observed: 5');
        expect(consoleLogMock).toHaveBeenCalledWith('Core reserved codes observed: 2');
        expect(consoleLogMock).toHaveBeenCalledWith('Pack-local codes observed: 3');
        expect(consoleLogMock).toHaveBeenCalledWith('Taxonomy repaired findings: 1');
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Code: ARCH_TEST'));
    });

    test('outputs json when --json is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.inspectFederationEvaluationFindings).mockReturnValue({
            totalFindings: 42
        } as any);

        await inspectFindingsCommand(['--json']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"totalFindings": 42'));
    });

    test('rejects preflight', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: false } as any);

        await expect(inspectFindingsCommand([])).rejects.toThrow('Process.exit(1) called');
        expect(consoleErrorMock).toHaveBeenCalledWith('Preflight rejected.');
    });
});
