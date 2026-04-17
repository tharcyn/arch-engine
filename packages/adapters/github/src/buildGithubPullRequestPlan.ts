import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';
import { DEFAULT_BASE_BRANCH } from './githubAdapterConstants.js';
import { buildShortIntegritySuffix, REFUSAL_REASONS } from '@arch-engine/adapter-shared';

export interface GithubPullRequestExecutionPlan {
    readonly repository: { readonly repositoryNamespace: string; readonly repositoryName: string };
    readonly branchName: string;
    readonly commitMessage: string;
    readonly pullRequestTitle: string;
    readonly pullRequestBody: string;
    readonly targetBaseBranch: string;
    readonly changedPaths: readonly string[];
    readonly authoritative: boolean;
    readonly integrityHash: string;
    readonly producerIdentity: string;
    readonly payloadSchemaVersion: string;
    repositoryIdentityAdvisory: boolean;
}

export type BuildGithubPullRequestPlanResult = 
    | { success: true; plan: GithubPullRequestExecutionPlan }
    | { success: false; refusalReason: string };

export function parseGithubRepositoryHint(repositoryHint?: string): { repositoryNamespace: string; repositoryName: string } | null {
    if (!repositoryHint) return null;
    
    let clean = repositoryHint.trim();
    if (clean.endsWith('.git')) {
        clean = clean.slice(0, -4);
    }
    
    if (clean.startsWith('https://github.com/')) {
        clean = clean.slice('https://github.com/'.length);
    } else if (clean.startsWith('http://github.com/')) {
        clean = clean.slice('http://github.com/'.length);
    } else if (clean.startsWith('git@github.com:')) {
        clean = clean.slice('git@github.com:'.length);
    } else if (clean.startsWith('github.com/')) {
        clean = clean.slice('github.com/'.length);
    }

    const parts = clean.split('/');
    if (parts.length >= 2) {
        const repositoryName = parts[parts.length - 1];
        const repositoryNamespace = parts.slice(0, -1).join('/');
        
        if (repositoryName.length > 0 && repositoryNamespace.length > 0) {
            return { repositoryNamespace, repositoryName };
        }
    }

    return null;
}

export function buildGithubPullRequestPlan(
    payload: FederationEvaluationPolicyPullRequestPayload
): BuildGithubPullRequestPlanResult {
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

    const repoDetails = parseGithubRepositoryHint(payload.repositoryHint);
    if (!repoDetails) {
        return { success: false, refusalReason: REFUSAL_REASONS.MALFORMED_REPOSITORY_HINT };
    }

    const shortHash = buildShortIntegritySuffix(payload.exportArtifactIntegrityHash);
    const branchName = `arch-engine/policy-update/${payload.targetProfile || 'unknown'}/${shortHash}`;
    const targetBaseBranch = process.env.ARCH_ENGINE_BASE_BRANCH || DEFAULT_BASE_BRANCH;

    const plan: GithubPullRequestExecutionPlan = {
        repository: repoDetails,
        branchName,
        commitMessage: payload.suggestedCommitMessage,
        pullRequestTitle: payload.suggestedTitle,
        pullRequestBody: payload.suggestedBodyMarkdown,
        targetBaseBranch,
        changedPaths: payload.changedPaths,
        authoritative: payload.authoritative,
        integrityHash: payload.exportArtifactIntegrityHash,
        producerIdentity: payload.exportArtifactProducerIdentity,
        payloadSchemaVersion: payload.pullRequestPayloadSchemaVersion,
        repositoryIdentityAdvisory: payload.repositoryHintSource === 'package-json'
    };

    return { success: true, plan };
}
