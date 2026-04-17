import { describe, test, expect } from 'vitest';
import { computeExportArtifactIntegrityHash } from '../../src/policy/computeExportArtifactIntegrityHash.js';
import type { FederationEvaluationPolicyPatchExport } from '../../src/policy/exportEvaluationPolicyPatchArtifact.js';

describe('Phase 16Y computeExportArtifactIntegrityHash', () => {

    const baseExport: Omit<FederationEvaluationPolicyPatchExport, 'exportArtifactIntegrityHash'> = {
        targetProfile: 'ci',
        targetProfileSource: 'cli-selected',
        authoritative: true,
        changedPaths: ['a', 'b'],
        includedSuggestions: [{ suggestionType: 'code_override', target: 'TRUST_01' } as any],
        excludedRiskySuggestions: [{ suggestionType: 'category_override', target: 'security' } as any],
        excludedNonAuthoritativeSuggestions: [],
        proposedCodeOverrides: { 'TRUST_01': 'info' },
        proposedCategoryOverrides: { 'security': 'warning' },
        proposedWaivers: [{ code: 'WAIVER_01' }],
        updatedFileTextPreview: 'text',
        markdownSummary: 'markdown',
        machineReadableSummary: 'machine',
        evaluationContextFingerprint: 'ctx-1',
        policyFileFingerprint: 'file-1',
        exportArtifactProducerIdentity: 'arch-engine@1.0.0',
        exportArtifactSchemaVersion: 'policy-patch-export.v1',
        exportArtifactRepositoryHint: 'org/repo1',
        exportArtifactRepositoryHintSource: 'env'
    };

    test('identical inputs produce identical hash', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport });
        expect(hash1).toBe(hash2);
    });

    test('ordering changes in arrays do NOT change hash', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, changedPaths: ['a', 'b'] });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, changedPaths: ['b', 'a'] });
        expect(hash1).toBe(hash2);
    });

    test('markdown formatting changes do NOT change hash', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, markdownSummary: 'version 1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, markdownSummary: 'version 2' });
        expect(hash1).toBe(hash2);
    });

    test('machineReadableSummary formatting changes do NOT change hash', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, machineReadableSummary: 'version 1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, machineReadableSummary: 'version 2' });
        expect(hash1).toBe(hash2);
    });

    test('changedPaths modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, changedPaths: ['a'] });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, changedPaths: ['a', 'b'] });
        expect(hash1).not.toBe(hash2);
    });

    test('evaluationContextFingerprint modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, evaluationContextFingerprint: 'ctx-1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, evaluationContextFingerprint: 'ctx-2' });
        expect(hash1).not.toBe(hash2);
    });

    test('policyFileFingerprint modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, policyFileFingerprint: 'file-1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, policyFileFingerprint: 'file-2' });
        expect(hash1).not.toBe(hash2);
    });

    test('suggestion identifiers modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, includedSuggestions: [{ suggestionType: 'code_override', target: 'TRUST_01' } as any] });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, includedSuggestions: [{ suggestionType: 'code_override', target: 'TRUST_02' } as any] });
        expect(hash1).not.toBe(hash2);
    });

    test('producer identity modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactProducerIdentity: 'arch-engine@1.0.0' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactProducerIdentity: 'arch-engine@1.1.0' });
        expect(hash1).not.toBe(hash2);
    });

    test('schema version modification -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactSchemaVersion: 'policy-patch-export.v1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactSchemaVersion: 'policy-patch-export.v2' });
        expect(hash1).not.toBe(hash2);
    });

    test('hint change -> integrity hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo1' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo2' });
        expect(hash1).not.toBe(hash2);
    });

    test('absence -> integrity hash unchanged regardless of source', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: undefined });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: undefined, exportArtifactRepositoryHintSource: 'env' });
        expect(hash1).toBe(hash2);
    });

    test('hint present vs absent -> hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: undefined });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo1', exportArtifactRepositoryHintSource: 'env' });
        expect(hash1).not.toBe(hash2);
    });

    test('hint source change -> integrity hash changes', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo1', exportArtifactRepositoryHintSource: 'env' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo1', exportArtifactRepositoryHintSource: 'package-json' });
        expect(hash1).not.toBe(hash2);
    });

    test('hash equality across normalized equivalent inputs', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'github.com/org/repo' });
        const hash3 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'https://github.com/org/repo' });
        
        expect(hash1).toBe(hash2);
        expect(hash1).toBe(hash3);
    });

    test('hash inequality across different repositories', () => {
        const hash1 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo' });
        const hash2 = computeExportArtifactIntegrityHash({ ...baseExport, exportArtifactRepositoryHint: 'org/repo2' });
        expect(hash1).not.toBe(hash2);
    });

});
