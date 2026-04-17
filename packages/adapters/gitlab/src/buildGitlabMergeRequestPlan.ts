import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';
import { DEFAULT_BASE_BRANCH } from './gitlabAdapterConstants.js';
import { buildShortIntegritySuffix, REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { parseGitlabRepositoryHint } from './parseGitlabRepositoryHint.js';
import type { GitlabMergeRequestExecutionPlan } from './types/GitlabMergeRequestExecutionPlan.js';

export type BuildGitlabMergeRequestPlanResult = 
    | { success: true; plan: GitlabMergeRequestExecutionPlan }
    | { success: false; refusalReason: string };

export function buildGitlabMergeRequestPlan(
    payload: FederationEvaluationPolicyPullRequestPayload
): BuildGitlabMergeRequestPlanResult {
    if (payload.pullRequestPayloadSchemaVersion !== POLICY_PR_PAYLOAD_SCHEMA_VERSION) {
        return { success: false, refusalReason: REFUSAL_REASONS.SCHEMA_MISMATCH };
    }
    if (!payload.exportArtifactSchemaVersion) {
        return { success: false, refusalReason: REFUSAL_REASONS.MISSING_EXPORT_SCHEMA_VERSION };
    }
    if (!payload.exportArtifactIntegrityHash || payload.exportArtifactIntegrityHash.trim() === '') {
        return { success: false, refusalReason: REFUSAL_REASONS.MISSING_INTEGRITY_HASH };
    }
    if (!payload.exportArtifactProducerIdentity) {
        return { success: false, refusalReason: REFUSAL_REASONS.MISSING_PRODUCER_IDENTITY };
    }
    if (!payload.repositoryHint) {
        return { success: false, refusalReason: REFUSAL_REASONS.MISSING_REPOSITORY_HINT };
    }

    const repoDetails = parseGitlabRepositoryHint(payload.repositoryHint);
    if (!repoDetails) {
        return { success: false, refusalReason: REFUSAL_REASONS.MALFORMED_REPOSITORY_HINT };
    }

    const shortHash = buildShortIntegritySuffix(payload.exportArtifactIntegrityHash);
    const branchName = `arch-engine/policy-update/${payload.targetProfile || 'unknown'}/${shortHash}`;
    const targetBaseBranch = process.env.ARCH_ENGINE_BASE_BRANCH || DEFAULT_BASE_BRANCH;

    const plan: GitlabMergeRequestExecutionPlan = {
        repository: repoDetails,
        branchName,
        commitMessage: payload.suggestedCommitMessage,
        mergeRequestTitle: payload.suggestedTitle,
        mergeRequestDescription: payload.suggestedBodyMarkdown,
        targetBaseBranch,
        changedPaths: payload.changedPaths,
        authoritative: payload.authoritative,
        integrityHash: payload.exportArtifactIntegrityHash,
        producerIdentity: payload.exportArtifactProducerIdentity,
        payloadSchemaVersion: payload.pullRequestPayloadSchemaVersion,
        repositoryIdentityAdvisory: false
    };

    const isPackageJsonSource = payload.repositoryHintSource === 'package-json' || payload.repositoryHintSource === 'package.json';
    const isAdvisory = isPackageJsonSource && !payload.authoritative;
    
    // Also consider the strict disclaimer flags logic as enforced by core
    const fromDisclaimerFlags = payload.disclaimerFlags?.repositoryHintDerivedFromPackageJson && !payload.authoritative;

    if (isAdvisory || fromDisclaimerFlags) {
        plan.repositoryIdentityAdvisory = true;
    }

    return { success: true, plan };
}
