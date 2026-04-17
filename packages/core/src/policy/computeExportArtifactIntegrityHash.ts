import * as crypto from 'node:crypto';
import type { FederationEvaluationPolicyPatchExport } from './exportEvaluationPolicyPatchArtifact.js';
import type { FederationPolicySuggestionEntry } from './suggestEvaluationPolicyAdjustments.js';
import { normalizeRepositoryHint } from './normalizeRepositoryHint.js';

function getSuggestionId(s: FederationPolicySuggestionEntry): string {
    return `${s.suggestionType}:${s.target}`;
}

function getWaiverId(w: any): string {
    if (w && typeof w === 'object' && w.code) return w.code;
    return typeof w === 'object' ? JSON.stringify(w) : String(w);
}

export function computeExportArtifactIntegrityHash(
    exportObject: Omit<FederationEvaluationPolicyPatchExport, 'exportArtifactIntegrityHash'>
): string {
    const canonical = {
        authoritative: exportObject.authoritative,
        changedPathsSorted: [...exportObject.changedPaths].sort(),
        evaluationContextFingerprint: exportObject.evaluationContextFingerprint || null,
        excludedNonAuthoritativeSuggestionIdsSorted: exportObject.excludedNonAuthoritativeSuggestions.map(getSuggestionId).sort(),
        excludedRiskySuggestionIdsSorted: exportObject.excludedRiskySuggestions.map(getSuggestionId).sort(),
        includedSuggestionIdsSorted: exportObject.includedSuggestions.map(getSuggestionId).sort(),
        policyFileFingerprint: exportObject.policyFileFingerprint || null,
        exportArtifactProducerIdentity: exportObject.exportArtifactProducerIdentity,
        exportArtifactSchemaVersion: exportObject.exportArtifactSchemaVersion,
        ...(exportObject.exportArtifactRepositoryHint ? { 
            repositoryHintNormalized: normalizeRepositoryHint(exportObject.exportArtifactRepositoryHint),
            exportArtifactRepositoryHintSource: exportObject.exportArtifactRepositoryHintSource 
        } : {}),
        proposedCategoryOverrideKeysSorted: Object.keys(exportObject.proposedCategoryOverrides).sort(),
        proposedCodeOverrideKeysSorted: Object.keys(exportObject.proposedCodeOverrides).sort(),
        proposedWaiverIdsSorted: exportObject.proposedWaivers.map(getWaiverId).sort(),
        targetProfile: exportObject.targetProfile || null,
        targetProfileSource: exportObject.targetProfileSource
    };

    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
