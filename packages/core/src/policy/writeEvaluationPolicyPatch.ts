import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { FederationEvaluationPolicyPatchApplyResult } from './applyEvaluationPolicyPatchArtifact.js';

export interface FederationEvaluationPolicyPatchWriteResult {
    readonly writeAttempted: boolean;
    readonly writePerformed: boolean;
    readonly dryRun: boolean;
    readonly writtenPath?: string;
    readonly tempPathUsed?: string;
    readonly backupCreated: boolean;
    readonly backupPath?: string;
    readonly changedPaths: string[];
    readonly originalPolicyFileFingerprint?: string | null;
    readonly currentPolicyFileFingerprint?: string | null;
    readonly fingerprintMatch?: boolean;
    readonly staleWriteDetected?: boolean;

    readonly evaluationContextFingerprintOriginal?: string;
    readonly evaluationContextFingerprintCurrent?: string;
    readonly contextFingerprintMatch?: boolean;
    readonly contextMismatchDetected?: boolean;

    readonly refusalReason?: string;
    readonly summaryMessage: string;
}

function computeFileFingerprint(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function writeEvaluationPolicyPatch(
    targetPath: string,
    applyResult: FederationEvaluationPolicyPatchApplyResult,
    options: { 
        dryRun: boolean; 
        originalPolicyFileFingerprint?: string | null;
        currentEvaluationContextFingerprint?: string;
    }
): FederationEvaluationPolicyPatchWriteResult {
    if (!applyResult.applicable || !applyResult.updatedFileText) {
        return {
            writeAttempted: false,
            writePerformed: false,
            dryRun: options.dryRun,
            backupCreated: false,
            changedPaths: [],
            refusalReason: applyResult.refusalReason || 'Patch not applicable',
            summaryMessage: applyResult.summaryMessage || 'Refused to write: Patch not applicable.'
        };
    }

    if (options.dryRun) {
        return {
            writeAttempted: false,
            writePerformed: false,
            dryRun: true,
            backupCreated: false,
            changedPaths: applyResult.changedPaths,
            summaryMessage: `Dry-run only. No file written.`
        };
    }

    // Try to safely write
    const resolvedPath = path.resolve(targetPath);
    let tempPathUsed: string | undefined = undefined;
    let backupPath: string | undefined = undefined;
    let backupCreated = false;

    try {
        let currentFingerprint: string | null = null;
        let fingerprintMatch = true;

        const originalContextFingerprint = applyResult.evaluationContextFingerprint;
        const currentContextFingerprint = options.currentEvaluationContextFingerprint;
        
        let contextFingerprintMatch = true;
        let contextMismatchDetected = false;

        if (!options.dryRun && originalContextFingerprint && currentContextFingerprint) {
            if (originalContextFingerprint !== currentContextFingerprint) {
                contextFingerprintMatch = false;
                contextMismatchDetected = true;
                
                return {
                    writeAttempted: true,
                    writePerformed: false,
                    dryRun: false,
                    backupCreated: false,
                    changedPaths: applyResult.changedPaths,
                    evaluationContextFingerprintOriginal: originalContextFingerprint,
                    evaluationContextFingerprintCurrent: currentContextFingerprint,
                    contextFingerprintMatch: false,
                    contextMismatchDetected: true,
                    refusalReason: 'patch_artifact_context_mismatch',
                    summaryMessage: 'Write refused: patch artifact no longer matches evaluation context.'
                };
            }
        } else if (!options.dryRun && !originalContextFingerprint) {
            // legacy artifact
            contextFingerprintMatch = true;
            contextMismatchDetected = false;
        }

        if (fs.existsSync(resolvedPath)) {
            const currentContent = fs.readFileSync(resolvedPath, 'utf8');
            currentFingerprint = computeFileFingerprint(currentContent);
            
            if (options.originalPolicyFileFingerprint !== undefined && currentFingerprint !== options.originalPolicyFileFingerprint) {
                fingerprintMatch = false;
            }
        } else if (options.originalPolicyFileFingerprint) {
            // File was deleted since patch generation
            fingerprintMatch = false;
        }

        if (!fingerprintMatch) {
            return {
                writeAttempted: true,
                writePerformed: false,
                dryRun: false,
                backupCreated: false,
                changedPaths: applyResult.changedPaths,
                originalPolicyFileFingerprint: options.originalPolicyFileFingerprint,
                currentPolicyFileFingerprint: currentFingerprint,
                fingerprintMatch: false,
                staleWriteDetected: true,
                refusalReason: 'target_file_modified_since_patch_generation',
                summaryMessage: 'Write refused: evaluation-policy.json changed since patch generation.'
            };
        }

        // 1. Create backup if file exists
        if (fs.existsSync(resolvedPath)) {
            backupPath = `${resolvedPath}.bak`;
            fs.copyFileSync(resolvedPath, backupPath);
            backupCreated = true;
        }

        // 2. Write to temp file
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        tempPathUsed = `${resolvedPath}.tmp.${randomSuffix}`;
        fs.writeFileSync(tempPathUsed, applyResult.updatedFileText, 'utf8');

        // 3. Atomically rename temp file over target file
        fs.renameSync(tempPathUsed, resolvedPath);

        return {
            writeAttempted: true,
            writePerformed: true,
            dryRun: false,
            writtenPath: resolvedPath,
            tempPathUsed,
            backupCreated,
            backupPath,
            changedPaths: applyResult.changedPaths,
            originalPolicyFileFingerprint: options.originalPolicyFileFingerprint,
            currentPolicyFileFingerprint: currentFingerprint,
            fingerprintMatch: true,
            staleWriteDetected: false,
            evaluationContextFingerprintOriginal: originalContextFingerprint,
            evaluationContextFingerprintCurrent: currentContextFingerprint,
            contextFingerprintMatch,
            contextMismatchDetected,
            summaryMessage: `Write completed: ${resolvedPath}`
        };

    } catch (e: any) {
        // Try to clean up temp file if rename failed
        if (tempPathUsed && fs.existsSync(tempPathUsed)) {
            try { fs.unlinkSync(tempPathUsed); } catch {}
        }
        
        return {
            writeAttempted: true,
            writePerformed: false,
            dryRun: false,
            backupCreated,
            backupPath,
            changedPaths: applyResult.changedPaths,
            originalPolicyFileFingerprint: options.originalPolicyFileFingerprint,
            evaluationContextFingerprintOriginal: applyResult.evaluationContextFingerprint,
            evaluationContextFingerprintCurrent: options.currentEvaluationContextFingerprint,
            contextFingerprintMatch: false,
            contextMismatchDetected: false,
            refusalReason: `Write failed: ${e.message}`,
            summaryMessage: `Write failed during atomic replace: ${e.message}`
        };
    }
}
