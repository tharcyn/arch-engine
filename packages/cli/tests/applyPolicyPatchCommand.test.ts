import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { applyPolicyPatchCommand } from '../src/applyPolicyPatchCommand.js';
import * as core from '@arch-engine/core';

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
        applyEvaluationPolicyPatchArtifact: vi.fn(),
        writeEvaluationPolicyPatch: vi.fn(),
        computeEvaluationContextFingerprint: vi.fn(),
        resolveEvaluationPolicyTargetProfile: vi.fn()
    };
});
vi.mock('../src/loadEvaluationPolicyFile.js');

describe('Phase 16V applyPolicyPatchCommand', () => {
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
        
        vi.mocked(core.generateEvaluationPolicyPatchArtifact).mockReturnValue({
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            evaluationContextFingerprint: 'mock-context-hash',
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [{} as any],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated authoritative patch.'
        });

        vi.mocked(core.computeEvaluationContextFingerprint).mockReturnValue('mock-context-hash');
        vi.mocked(core.resolveEvaluationPolicyTargetProfile).mockReturnValue({ targetProfile: 'mock-target', targetProfileSource: 'cli-selected' });

        vi.mocked(core.applyEvaluationPolicyPatchArtifact).mockReturnValue({
            applicable: true,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['profiles.ci.codeOverrides'],
            updatedFileText: '{"profiles": {"ci": {"codeOverrides": {"TRUST_01": "info"}}}}',
            summaryMessage: 'Patch applicable. 1 paths changed.'
        });

        vi.mocked(core.writeEvaluationPolicyPatch).mockReturnValue({
            writeAttempted: false,
            writePerformed: false,
            dryRun: true,
            backupCreated: false,
            changedPaths: ['profiles.ci.codeOverrides'],
            summaryMessage: 'Dry-run only. No file written.'
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('calls core apply generator and prints dry-run summary', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await applyPolicyPatchCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Patch applicable. 1 paths changed.'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Target profile: ci'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Target profile source: cli-selected'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Authoritative: true'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Dry-run only. No file written.'));
        
        expect(core.writeEvaluationPolicyPatch).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            { dryRun: true, originalPolicyFileFingerprint: null, currentEvaluationContextFingerprint: 'mock-context-hash' }
        );
    });

    test('writes to disk when --apply flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        vi.mocked(core.writeEvaluationPolicyPatch).mockReturnValue({
            writeAttempted: true,
            writePerformed: true,
            dryRun: false,
            writtenPath: '/path/to/evaluation-policy.json',
            backupCreated: true,
            backupPath: '/path/to/evaluation-policy.json.bak',
            changedPaths: ['profiles.ci.codeOverrides'],
            summaryMessage: 'Write completed: /path/to/evaluation-policy.json'
        });

        await applyPolicyPatchCommand(['--apply']);

        expect(core.writeEvaluationPolicyPatch).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            { dryRun: false, originalPolicyFileFingerprint: null, currentEvaluationContextFingerprint: 'mock-context-hash' }
        );
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Write completed: /path/to/evaluation-policy.json'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Backup created'));
    });

    test('prints refusal reason when not applicable', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        vi.mocked(core.applyEvaluationPolicyPatchArtifact).mockReturnValue({
            applicable: false,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'No included suggestions to apply.',
            summaryMessage: 'Refused: No safe suggestions are included in the patch artifact.'
        });

        vi.mocked(core.writeEvaluationPolicyPatch).mockReturnValue({
            writeAttempted: false,
            writePerformed: false,
            dryRun: true,
            backupCreated: false,
            changedPaths: [],
            refusalReason: 'No included suggestions to apply.',
            summaryMessage: 'Refused to write: Patch not applicable.'
        });

        await applyPolicyPatchCommand([]);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Patch applicable: false'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Refusal reason: No included suggestions to apply.'));
    });
});
