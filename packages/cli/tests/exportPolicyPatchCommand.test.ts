import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { exportPolicyPatchCommand } from '../src/exportPolicyPatchCommand.js';
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
        resolveEvaluationPolicyTargetProfile: vi.fn()
    };
});
vi.mock('../src/loadEvaluationPolicyFile.js');

describe('Phase 16X exportPolicyPatchCommand', () => {
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

        vi.mocked(core.exportEvaluationPolicyPatchArtifact).mockReturnValue({
            targetProfile: 'ci',
            targetProfileSource: 'cli-selected',
            authoritative: true,
            changedPaths: ['profiles.ci.codeOverrides'],
            includedSuggestions: [{} as any],
            excludedRiskySuggestions: [],
            excludedNonAuthoritativeSuggestions: [],
            proposedCodeOverrides: { TRUST_01: 'info' },
            proposedCategoryOverrides: {},
            proposedWaivers: [],
            updatedFileTextPreview: '{}',
            markdownSummary: '## Policy Patch Export Mock',
            machineReadableSummary: 'Exported authoritative patch preview Mock',
            exportArtifactProducerIdentity: 'arch-engine@1.0.0',
            exportArtifactSchemaVersion: 'policy-patch-export.v1',
            exportArtifactRepositoryHint: 'org/repo',
            exportArtifactRepositoryHintSource: 'env'
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('calls core export generator and prints machine-readable summary by default', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await exportPolicyPatchCommand(['-t', 'topo.json', '-p', 'packA']);

        expect(consoleLogMock).toHaveBeenCalledWith('Exported authoritative patch preview Mock');
        
        expect(core.exportEvaluationPolicyPatchArtifact).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            { policyFileFingerprint: null }
        );
    });

    test('prints markdown when --markdown flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await exportPolicyPatchCommand(['--markdown']);

        expect(consoleLogMock).toHaveBeenCalledWith('## Policy Patch Export Mock');
    });

    test('prints JSON when --json flag is provided', async () => {
        vi.mocked(core.assessFederationExecutionPreflight).mockReturnValue({ preflightAccepted: true } as any);
        vi.mocked(core.suggestEvaluationPolicyAdjustments).mockReturnValue({
            summaryMessage: '',
            suggestions: []
        } as any);

        await exportPolicyPatchCommand(['--json']);

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"markdownSummary": "## Policy Patch Export Mock"'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('"authoritative": true'));
    });
});
