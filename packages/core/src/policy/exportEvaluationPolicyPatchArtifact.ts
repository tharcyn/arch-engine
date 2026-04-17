import type { FederationEvaluationPolicyPatchArtifact } from './generateEvaluationPolicyPatchArtifact.js';
import type { FederationEvaluationPolicyPatchApplyResult } from './applyEvaluationPolicyPatchArtifact.js';

import type { FederationPolicySuggestionEntry } from './suggestEvaluationPolicyAdjustments.js';
import { computeExportArtifactIntegrityHash } from './computeExportArtifactIntegrityHash.js';
import { ARCH_ENGINE_VERSION } from '../version.js';
import { resolveRepositoryHint } from './resolveRepositoryHint.js';

export const POLICY_PATCH_EXPORT_SCHEMA_VERSION = 'policy-patch-export.v1';

export interface FederationEvaluationPolicyPatchExport {
    readonly targetProfile?: string;
    readonly targetProfileSource: string;
    readonly authoritative: boolean;
    readonly changedPaths: readonly string[];
    
    readonly includedSuggestions: readonly FederationPolicySuggestionEntry[];
    readonly excludedRiskySuggestions: readonly FederationPolicySuggestionEntry[];
    readonly excludedNonAuthoritativeSuggestions: readonly FederationPolicySuggestionEntry[];
    
    readonly proposedCodeOverrides: Record<string, string>;
    readonly proposedCategoryOverrides: Record<string, string>;
    readonly proposedWaivers: readonly any[];
    
    readonly updatedFileTextPreview?: string;
    
    readonly markdownSummary: string;
    readonly machineReadableSummary: string;
    
    readonly evaluationContextFingerprint?: string;
    readonly policyFileFingerprint?: string;
    
    readonly exportArtifactProducerIdentity: string;
    readonly exportArtifactSchemaVersion: string;
    readonly exportArtifactRepositoryHint?: string;
    readonly exportArtifactRepositoryHintSource?: string;
    exportArtifactIntegrityHash?: string;
}

export function exportEvaluationPolicyPatchArtifact(
    patchArtifact: FederationEvaluationPolicyPatchArtifact,
    applyResult: FederationEvaluationPolicyPatchApplyResult,
    options?: {
        policyFileFingerprint?: string | null;
    }
): FederationEvaluationPolicyPatchExport {
    const includedSuggestionsCount = patchArtifact.includedSuggestions.length;
    const excludedRiskySuggestionsCount = patchArtifact.excludedRiskySuggestions.length;
    const excludedNonAuthoritativeSuggestionsCount = patchArtifact.excludedNonAuthoritativeSuggestions.length;

    const proposedCodeOverridesCount = Object.keys(patchArtifact.proposedCodeOverrides).length;
    const proposedCategoryOverridesCount = Object.keys(patchArtifact.proposedCategoryOverrides).length;
    const proposedWaiversCount = patchArtifact.proposedWaivers.length;

    const changedPaths = [...applyResult.changedPaths];
    const authoritative = patchArtifact.targetProfileAuthoritative;

    let machineReadableSummary = '';
    if (!authoritative) {
        machineReadableSummary = `Exported scaffold patch preview. Target profile is not authoritative. Included: ${includedSuggestionsCount}, Excluded (Risky): ${excludedRiskySuggestionsCount}, Excluded (Non-Authoritative): ${excludedNonAuthoritativeSuggestionsCount}.`;
    } else {
        machineReadableSummary = `Exported authoritative patch preview. Target profile: ${patchArtifact.targetProfile}. Changed paths: ${changedPaths.length}. Included: ${includedSuggestionsCount}, Excluded (Risky): ${excludedRiskySuggestionsCount}.`;
    }

    let markdownSummary = '## Policy Patch Export\n\n';
    markdownSummary += `**Target Profile:** \`${patchArtifact.targetProfile || 'unknown'}\` (Source: ${patchArtifact.targetProfileSource})\n`;
    markdownSummary += `**Authoritative:** ${authoritative ? '✅ Yes' : '❌ No'}\n\n`;

    if (!authoritative) {
        markdownSummary += '> [!WARNING]\n> This patch is non-authoritative (e.g. synthetic fallback). It cannot be safely applied as a file mutation without explicit operator review.\n\n';
    } else if (applyResult.refusalReason) {
        markdownSummary += `> [!WARNING]\n> Patch application dry-run refused: ${applyResult.refusalReason}\n\n`;
    }

    markdownSummary += '### Summary\n';
    markdownSummary += `- **Suggestions Included:** ${includedSuggestionsCount}\n`;
    markdownSummary += `- **Suggestions Excluded (Risky):** ${excludedRiskySuggestionsCount}\n`;
    markdownSummary += `- **Suggestions Excluded (Non-Authoritative):** ${excludedNonAuthoritativeSuggestionsCount}\n`;
    
    if (changedPaths.length > 0) {
        markdownSummary += `\n### Changed Paths\n`;
        for (const p of changedPaths) {
            markdownSummary += `- \`${p}\`\n`;
        }
    }

    const proposedSections = [];
    if (proposedCodeOverridesCount > 0) proposedSections.push(`${proposedCodeOverridesCount} code overrides`);
    if (proposedCategoryOverridesCount > 0) proposedSections.push(`${proposedCategoryOverridesCount} category overrides`);
    if (proposedWaiversCount > 0) proposedSections.push(`${proposedWaiversCount} waivers`);

    if (proposedSections.length > 0) {
        markdownSummary += `\n### Proposals\nThis patch proposes adding: ${proposedSections.join(', ')}.\n`;
        
        if (proposedCodeOverridesCount > 0) {
            markdownSummary += `\n**Code Overrides:**\n\`\`\`json\n${JSON.stringify(patchArtifact.proposedCodeOverrides, null, 2)}\n\`\`\`\n`;
        }
        if (proposedCategoryOverridesCount > 0) {
            markdownSummary += `\n**Category Overrides:**\n\`\`\`json\n${JSON.stringify(patchArtifact.proposedCategoryOverrides, null, 2)}\n\`\`\`\n`;
        }
    }

    if (patchArtifact.evaluationContextFingerprint) {
        markdownSummary += `\n---\n*Context Fingerprint:* \`${patchArtifact.evaluationContextFingerprint}\`\n`;
    }
    if (options?.policyFileFingerprint) {
        markdownSummary += `*Policy File Fingerprint:* \`${options.policyFileFingerprint}\`\n`;
    }

    const exportObjectBase = {
        targetProfile: patchArtifact.targetProfile,
        targetProfileSource: patchArtifact.targetProfileSource,
        authoritative,
        changedPaths,
        includedSuggestions: patchArtifact.includedSuggestions,
        excludedRiskySuggestions: patchArtifact.excludedRiskySuggestions,
        excludedNonAuthoritativeSuggestions: patchArtifact.excludedNonAuthoritativeSuggestions,
        proposedCodeOverrides: patchArtifact.proposedCodeOverrides,
        proposedCategoryOverrides: patchArtifact.proposedCategoryOverrides,
        proposedWaivers: patchArtifact.proposedWaivers,
        updatedFileTextPreview: applyResult.updatedFileText,
        markdownSummary,
        machineReadableSummary,
        evaluationContextFingerprint: patchArtifact.evaluationContextFingerprint,
        policyFileFingerprint: options?.policyFileFingerprint || undefined,
        exportArtifactProducerIdentity: `arch-engine@${ARCH_ENGINE_VERSION}`,
        exportArtifactSchemaVersion: POLICY_PATCH_EXPORT_SCHEMA_VERSION
    } as Omit<FederationEvaluationPolicyPatchExport, 'exportArtifactIntegrityHash'>;

    const resolution = resolveRepositoryHint();
    if (resolution.hint) {
        (exportObjectBase as any).exportArtifactRepositoryHint = resolution.hint;
        (exportObjectBase as any).exportArtifactRepositoryHintSource = resolution.source;
    }

    const integrityHash = computeExportArtifactIntegrityHash(exportObjectBase);

    let producerFooter = `Produced by: \`arch-engine@${ARCH_ENGINE_VERSION}\`\nSchema: \`${POLICY_PATCH_EXPORT_SCHEMA_VERSION}\``;
    if (resolution.hint) {
        producerFooter += `\nRepository: \`${resolution.hint}\`\nRepository source: \`${resolution.source}\``;
        if (resolution.source === 'package-json') {
            producerFooter += `\n\n> [!NOTE]\n> Repository identity derived from \`package.json\` name.\n> For CI automation workflows, prefer \`ARCH_ENGINE_REPOSITORY_HINT\`.`;
        }
    }

    return {
        ...exportObjectBase,
        exportArtifactIntegrityHash: integrityHash,
        machineReadableSummary: `${exportObjectBase.machineReadableSummary} Hash: ${integrityHash}`,
        markdownSummary: `${exportObjectBase.markdownSummary}\n---\n*Export Artifact Integrity Hash:* \`${integrityHash}\`\n\n${producerFooter}\n`
    } as FederationEvaluationPolicyPatchExport;
}
