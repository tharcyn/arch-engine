import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { writeEvaluationPolicyPatch } from '../../src/policy/writeEvaluationPolicyPatch.js';
import type { FederationEvaluationPolicyPatchApplyResult } from '../../src/policy/applyEvaluationPolicyPatchArtifact.js';

vi.mock('node:fs');

describe('Phase 16V Stabilization writeEvaluationPolicyPatch', () => {

    beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('mock-content');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('refuses to write if patch is not applicable', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: false,
            targetProfileSource: 'synthetic',
            targetProfileAuthoritative: false,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'Non-authoritative target',
            summaryMessage: 'Refused'
        };

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { dryRun: false });

        expect(result.writeAttempted).toBe(false);
        expect(result.writePerformed).toBe(false);
        expect(result.backupCreated).toBe(false);
        expect(result.refusalReason).toContain('Non-authoritative');
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('dryRun mode does not write anything', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
        };

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { dryRun: true });

        expect(result.writeAttempted).toBe(false);
        expect(result.writePerformed).toBe(false);
        expect(result.dryRun).toBe(true);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('performs atomic write and backup', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
        };

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { dryRun: false });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(true);
        expect(result.backupCreated).toBe(true);
        expect(result.backupPath).toMatch(/test\.json\.bak$/);
        expect(result.writtenPath).toMatch(/test\.json$/);
        
        expect(fs.copyFileSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.tmp.'), 'updated', 'utf8');
        expect(fs.renameSync).toHaveBeenCalled();
    });

    test('cleans up temp file if rename fails', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
        };

        vi.mocked(fs.renameSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { dryRun: false });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(false);
        expect(result.refusalReason).toContain('Permission denied');
        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('refuses write if target file has been modified since patch generation', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
        };

        vi.mocked(fs.readFileSync).mockReturnValue('stalecontent');
        // 'stalecontent' sha256 is going to be different from 'originalhash'

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { 
            dryRun: false,
            originalPolicyFileFingerprint: 'originalhash'
        });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(false);
        expect(result.staleWriteDetected).toBe(true);
        expect(result.fingerprintMatch).toBe(false);
        expect(result.refusalReason).toContain('modified_since_patch_generation');
        expect(fs.renameSync).not.toHaveBeenCalled();
    });

    test('allows write if target file fingerprint matches', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
        };

        const originalText = 'content';
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(originalText, 'utf8').digest('hex');

        vi.mocked(fs.readFileSync).mockReturnValue(originalText);

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { 
            dryRun: false,
            originalPolicyFileFingerprint: hash
        });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(true);
        expect(result.staleWriteDetected).toBe(false);
        expect(result.fingerprintMatch).toBe(true);
        expect(fs.renameSync).toHaveBeenCalled();
    });

    test('refuses write if evaluation context fingerprint mismatches', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable',
            evaluationContextFingerprint: 'original-context-hash'
        };

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { 
            dryRun: false,
            currentEvaluationContextFingerprint: 'new-context-hash'
        });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(false);
        expect(result.contextMismatchDetected).toBe(true);
        expect(result.contextFingerprintMatch).toBe(false);
        expect(result.refusalReason).toContain('context_mismatch');
        expect(fs.renameSync).not.toHaveBeenCalled();
    });

    test('allows write if legacy artifact has no context fingerprint', () => {
        const applyResult: FederationEvaluationPolicyPatchApplyResult = {
            applicable: true,
            targetProfileSource: 'cli',
            targetProfileAuthoritative: true,
            changesApplied: true,
            changedPaths: ['a'],
            updatedFileText: 'updated',
            summaryMessage: 'Applicable'
            // No evaluationContextFingerprint
        };

        const result = writeEvaluationPolicyPatch('test.json', applyResult, { 
            dryRun: false,
            currentEvaluationContextFingerprint: 'new-context-hash'
        });

        expect(result.writeAttempted).toBe(true);
        expect(result.writePerformed).toBe(true);
        expect(result.contextMismatchDetected).toBe(false);
        expect(result.contextFingerprintMatch).toBe(true);
        expect(fs.renameSync).toHaveBeenCalled();
    });
});
