import type { FederationEvaluationPolicyPatchArtifact } from './generateEvaluationPolicyPatchArtifact.js';
import type { FederationEvaluationPolicyFile } from './validateEvaluationPolicyFile.js';
import { mutateEvaluationPolicyFileAst, type FederationEvaluationPolicyAstMutationResult } from './mutateEvaluationPolicyFileAst.js';

export interface FederationEvaluationPolicyPatchApplyResult {
    readonly applicable: boolean;
    readonly targetProfile?: string;
    readonly targetProfileSource: string;
    readonly targetProfileAuthoritative: boolean;
    readonly evaluationContextFingerprint?: string;
    readonly changesApplied: boolean;
    readonly changedPaths: string[];
    readonly updatedFileText?: string;
    readonly refusalReason?: string;
    readonly summaryMessage: string;
}

export function applyEvaluationPolicyPatchArtifact(
    originalFileText: string,
    parsedPolicyObject: FederationEvaluationPolicyFile,
    patchArtifact: FederationEvaluationPolicyPatchArtifact
): FederationEvaluationPolicyPatchApplyResult {
    
    if (!patchArtifact.targetProfileAuthoritative) {
        return {
            applicable: false,
            targetProfile: patchArtifact.targetProfile,
            targetProfileSource: patchArtifact.targetProfileSource,
            targetProfileAuthoritative: false,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'Target profile is non-authoritative.',
            summaryMessage: 'Refused: Target profile is non-authoritative.'
        };
    }

    if (patchArtifact.includedSuggestions.length === 0) {
        return {
            applicable: false,
            targetProfile: patchArtifact.targetProfile,
            targetProfileSource: patchArtifact.targetProfileSource,
            targetProfileAuthoritative: patchArtifact.targetProfileAuthoritative,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'No included suggestions to apply.',
            summaryMessage: 'Refused: No safe suggestions are included in the patch artifact.'
        };
    }

    if (!patchArtifact.targetProfile) {
        return {
            applicable: false,
            targetProfile: patchArtifact.targetProfile,
            targetProfileSource: patchArtifact.targetProfileSource,
            targetProfileAuthoritative: patchArtifact.targetProfileAuthoritative,
            changesApplied: false,
            changedPaths: [],
            refusalReason: 'Target profile cannot be resolved (missing).',
            summaryMessage: 'Refused: Missing target profile.'
        };
    }

    // Try applying AST mutation
    const astResult = mutateEvaluationPolicyFileAst(originalFileText, parsedPolicyObject, patchArtifact);

    if (!astResult.mutationApplied) {
        return {
            applicable: false,
            targetProfile: patchArtifact.targetProfile,
            targetProfileSource: patchArtifact.targetProfileSource,
            targetProfileAuthoritative: patchArtifact.targetProfileAuthoritative,
            changesApplied: false,
            changedPaths: [],
            refusalReason: astResult.refusalReason || 'AST mutation refused.',
            summaryMessage: `Refused: ${astResult.refusalReason || 'AST mutation failed.'}`
        };
    }

    return {
        applicable: true,
        targetProfile: patchArtifact.targetProfile,
        targetProfileSource: patchArtifact.targetProfileSource,
        targetProfileAuthoritative: patchArtifact.targetProfileAuthoritative,
        evaluationContextFingerprint: patchArtifact.evaluationContextFingerprint,
        changesApplied: true, // Indicates it can be / was applied
        changedPaths: astResult.changedPaths,
        updatedFileText: astResult.updatedFileText,
        summaryMessage: `Patch applicable. ${astResult.changedPaths.length} paths changed.`
    };
}
