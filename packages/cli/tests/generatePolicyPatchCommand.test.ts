import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { generatePolicyPatchCommand } from '../src/generatePolicyPatchCommand.js';
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
        aggregateFederationEvaluationSeverity: vi.fn(),
        generateEvaluationPolicyPatchArtifact: vi.fn(),
        computeEvaluationContextFingerprint: vi.fn(),
        resolveEvaluationPolicyTargetProfile: vi.fn()
    };
});
vi.mock('../src/loadEvaluationPolicyFile.js');

describe('Phase 16U generatePolicyPatchCommand', () => {
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
        vi.mocked(core.computeEvaluationContextFingerprint).mockReturnValue('mock-context-hash');
        vi.mocked(core.resolveEvaluationPolicyTargetProfile).mockReturnValue({ targetProfile: 'mock-target', targetProfileSource: 'cli-selected' });
        
        vi.mocked(core.generateEvaluationPolicyPatchArtifact).mockReturnValue({
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [{} as any],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated authoritative patch.'
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('calls core patch generator and prints human readable output', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
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
                    snippetPathHint: 'profiles.ci.codeOverrides',
                    profileTarget: 'ci',
                    profileTargetSource: 'cli-selected',
                    snippetJson: { TRUST_01: 'info' }
                }
            ]
        } as any);

        await generatePolicyPatchCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Generated authoritative patch.'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Target Profile: ci'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Target Profile Source: cli-selected'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Authoritative: true'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"TRUST_01": "info"'));
    });

    test('outputs json when --json is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: 'Found 1 candidate',
            suggestions: []
        } as any);

        await generatePolicyPatchCommand(['--json']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"summaryMessage": "Generated authoritative patch."'));
    });
});
