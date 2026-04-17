import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { emitPolicyPrCommand } from '../src/emitPolicyPrCommand.js';
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
        exportEvaluationPolicyPatchArtifact: vi.fn(),
        computeEvaluationContextFingerprint: vi.fn(),
        resolveEvaluationPolicyTargetProfile: vi.fn(),
        buildPolicyPatchPullRequestPayload: vi.fn()
    };
});
vi.mock('../src/loadEvaluationPolicyFile.js');

describe('Phase 16Y emitPolicyPrCommand', () => {
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
            proposedCodeOverrides: {},
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            summaryMessage: 'Generated authoritative patch.'
        });

        vi.mocked(core.computeEvaluationContextFingerprint).mockReturnValue('mock-context-hash');
        vi.mocked(core.resolveEvaluationPolicyTargetProfile).mockReturnValue({ targetProfile: 'ci', targetProfileSource: 'cli-selected' });

        vi.mocked(core.applyEvaluationPolicyPatchArtifact).mockReturnValue({
            applicable: true,
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['profiles.ci.codeOverrides'],
            updatedFileText: '{}',
            summaryMessage: 'Patch applicable.'
        });

        vi.mocked(core.exportEvaluationPolicyPatchArtifact).mockReturnValue({
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            authoritative: true,
            changedPaths: [],
            includedSuggestions: [],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            proposedCodeOverrides: {},
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            markdownSummary: '## Policy Patch Export Mock',
            machineReadableSummary: 'Exported authoritative patch preview Mock',
            exportArtifactProducerIdentity: 'arch-engine@1.0.0',
            exportArtifactSchemaVersion: 'policy-patch-export.v1'
        });

        vi.mocked(core.buildPolicyPatchPullRequestPayload).mockReturnValue({
            suggestedTitle: 'mock-title',
            suggestedCommitMessage: 'mock-commit-message',
            suggestedBodyMarkdown: 'mock-body-markdown',
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            authoritative: true,
            changedPaths: [],
            exportArtifactProducerIdentity: 'arch-engine@1.0.0',
            exportArtifactSchemaVersion: 'policy-patch-export.v1',
            pullRequestPayloadSchemaVersion: 'policy-pr-payload.v1',
            disclaimerFlags: { repositoryHintDerivedFromPackageJson: false, nonAuthoritativePatch: false }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('calls core payload builder and prints human-readable summary by default', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await emitPolicyPrCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Generated PR Payload for Profile: ci'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('mock-title'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('mock-commit-message'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('mock-body-markdown'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('PR Payload Schema: `policy-pr-payload.v1`'));
        
        expect(core.buildPolicyPatchPullRequestPayload).toHaveBeenCalledWith(
            expect.any(Object)
        );
    });

    test('prints JSON when --json flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await emitPolicyPrCommand(['--json']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"suggestedTitle": "mock-title"'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"pullRequestPayloadSchemaVersion": "policy-pr-payload.v1"'));
        expect(consoleLogMock).not.toHaveBeenCalledWith(expect.stringContaining('Generated PR Payload'));
    });

    test('prints only title when --title-only flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await emitPolicyPrCommand(['--title-only']);

        expect(consoleLogMock).toHaveBeenCalledWith('mock-title');
        expect(consoleLogMock).not.toHaveBeenCalledWith('mock-commit-message');
    });

    test('prints only commit message when --commit-message-only flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await emitPolicyPrCommand(['--commit-message-only']);

        expect(consoleLogMock).toHaveBeenCalledWith('mock-commit-message');
        expect(consoleLogMock).not.toHaveBeenCalledWith('mock-title');
    });

    test('prints only body when --body-only flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await emitPolicyPrCommand(['--body-only']);

        expect(consoleLogMock).toHaveBeenCalledWith('mock-body-markdown');
        expect(consoleLogMock).not.toHaveBeenCalledWith('mock-title');
    });
});
