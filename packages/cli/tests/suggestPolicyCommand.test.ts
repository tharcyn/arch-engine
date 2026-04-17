import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { suggestPolicyCommand } from '../src/suggestPolicyCommand.js';
import * as core from '@arch-engine/core';
import * as loadEval from '../src/loadEvaluationPolicyFile.js';

vi.mock('fs');
vi.mock('@arch-engine/core', () => {
    return {
        loadTopologyDataset: vi.fn(),
        loadPolicyPack: vi.fn(),
        assessFederationExecutionPreflight: vi.fn(),
        materializeFederationExecutionPlan: vi.fn(),
        runFederationEvaluationPlan: vi.fn(),
        inspectFederationEvaluationFindings: vi.fn(),
        suggestEvaluationPolicyAdjustments: vi.fn(),
        resolveEvaluationPolicyProfile: vi.fn(),
        assessFederationEvaluationPolicyGate: vi.fn(),
        aggregateFederationEvaluationSeverity: vi.fn()
    };
});
vi.mock('../src/loadEvaluationPolicyFile.js', () => {
    return {
        loadEvaluationPolicyFile: vi.fn()
    };
});

describe('Phase 16R suggestPolicyCommand', () => {
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

    test('calls core suggest routine and prints human readable output', async () => {
        vi.mocked(core.loadTopologyDataset).mockReturnValue({} as any);
        vi.mocked(core.loadPolicyPack).mockReturnValue({} as any);
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.materializeFederationExecutionPlan).mockReturnValue({} as any);
        vi.mocked(core.runFederationEvaluationPlan).mockReturnValue({} as any);
        vi.mocked(core.inspectFederationEvaluationFindings).mockReturnValue({} as any);
        
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: 'Found 1 candidate policy adjustments (0 risky).',
            suggestions: [
                {
                    suggestionType: 'code_override',
                    target: 'TRUST_01',
                    suggestedAction: 'Add codeOverride',
                    rationale: 'Repeated findings from exact code',
                    isRisky: false,
                    snippetType: 'code_override',
                    snippetPathHint: 'profiles.default.codeOverrides',
                    profileTarget: 'default',
                    profileTargetSource: 'synthetic-fallback',
                    snippetJson: { TRUST_01: 'info' }
                }
            ]
        } as any);

        await suggestPolicyCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Found 1 candidate policy adjustments'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Suggested [code_override]: Add codeOverride for \'TRUST_01\''));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Rationale: Repeated findings from exact code'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Path hint: profiles.default.codeOverrides'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Profile target source: synthetic-fallback'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"TRUST_01": "info"'));
    });

    test('outputs json when --json is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: 'Found 1 candidate',
            suggestions: []
        } as any);

        await suggestPolicyCommand(['--json']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"summaryMessage": "Found 1 candidate"'));
    });

    test('integrates existing policy context', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(loadEval.loadEvaluationPolicyFile).mockReturnValue({} as any);
        vi.mocked(core.resolveEvaluationPolicyProfile).mockReturnValue({} as any);
        vi.mocked(core.aggregateFederationEvaluationSeverity).mockReturnValue({} as any);
        vi.mocked(core.assessFederationEvaluationPolicyGate).mockReturnValue({} as any);
        
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: 'Checked with policy',
            suggestions: []
        } as any);

        await suggestPolicyCommand(['--policy', 'some-policy.json']);

        expect(loadEval.loadEvaluationPolicyFile).toHaveBeenCalledWith('some-policy.json');
        expect(core.assessFederationEvaluationPolicyGate).toHaveBeenCalled();
        expect(core.suggestEvaluationPolicyAdjustments).toHaveBeenCalled(); // Should be called with the decision
    });

    test('rejects preflight', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: false } as any);

        await expect(suggestPolicyCommand([])).rejects.toThrow('Process.exit(1) called');
        expect(consoleErrorMock).toHaveBeenCalledWith('Preflight rejected.');
    });
});
