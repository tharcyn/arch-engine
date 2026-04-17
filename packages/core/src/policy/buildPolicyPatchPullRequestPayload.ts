import type { FederationEvaluationPolicyPatchExport } from './exportEvaluationPolicyPatchArtifact.js';
import { POLICY_PR_PAYLOAD_SCHEMA_VERSION } from './constants.js';

export interface FederationEvaluationPolicyPullRequestPayload {
    readonly pullRequestPayloadSchemaVersion: string;
    readonly suggestedTitle: string;
    readonly suggestedCommitMessage: string;
    readonly suggestedBodyMarkdown: string;
    readonly repositoryHint?: string;
    readonly repositoryHintSource?: string;
    readonly targetProfile?: string;
    readonly targetProfileSource: string;
    readonly authoritative: boolean;
    readonly changedPaths: readonly string[];
    readonly exportArtifactIntegrityHash?: string;
    readonly exportArtifactProducerIdentity: string;
    readonly exportArtifactSchemaVersion: string;
    readonly evaluationContextFingerprint?: string;
    readonly policyFileFingerprint?: string;
    readonly disclaimerFlags: {
        readonly repositoryHintDerivedFromPackageJson: boolean;
        readonly nonAuthoritativePatch: boolean;
    };
}

export function buildPolicyPatchPullRequestPayload(
    exportArtifact: FederationEvaluationPolicyPatchExport
): FederationEvaluationPolicyPullRequestPayload {
    const profile = exportArtifact.targetProfile || 'unknown';
    
    const suggestedTitle = `arch-engine: update evaluation policy (profile: ${profile})`;
    const suggestedCommitMessage = `arch-engine: update evaluation policy for profile ${profile}`;

    let suggestedBodyMarkdown = exportArtifact.markdownSummary;
    const isPackageJsonSource = exportArtifact.exportArtifactRepositoryHintSource === 'package-json';

    if (isPackageJsonSource && !suggestedBodyMarkdown.includes('best-effort hint for automation workflows')) {
        suggestedBodyMarkdown += `\n\n> [!WARNING]\n> **PR Automation Advisory:** This repository identity was derived from \`package.json\`. It should be treated as a best-effort hint for automation workflows. Use \`ARCH_ENGINE_REPOSITORY_HINT\` for strong CI identity binding.\n`;
    }

    return {
        pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
        suggestedTitle,
        suggestedCommitMessage,
        suggestedBodyMarkdown,
        repositoryHint: exportArtifact.exportArtifactRepositoryHint,
        repositoryHintSource: exportArtifact.exportArtifactRepositoryHintSource,
        targetProfile: exportArtifact.targetProfile,
        targetProfileSource: exportArtifact.targetProfileSource,
        authoritative: exportArtifact.authoritative,
        changedPaths: exportArtifact.changedPaths,
        exportArtifactIntegrityHash: exportArtifact.exportArtifactIntegrityHash,
        exportArtifactProducerIdentity: exportArtifact.exportArtifactProducerIdentity,
        exportArtifactSchemaVersion: exportArtifact.exportArtifactSchemaVersion,
        evaluationContextFingerprint: exportArtifact.evaluationContextFingerprint,
        policyFileFingerprint: exportArtifact.policyFileFingerprint,
        disclaimerFlags: {
            repositoryHintDerivedFromPackageJson: isPackageJsonSource,
            nonAuthoritativePatch: !exportArtifact.authoritative
        }
    };
}
