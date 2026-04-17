import { GithubPullRequestExecutionPlan, parseGithubRepositoryHint } from './buildGithubPullRequestPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';

export interface GithubRuntimeRepositoryVerificationResult {
    repositoryContextVerified: boolean;
    runtimeRepository?: string;
    refusalReason?: string;
    advisory?: string;
}

export function verifyGithubRuntimeRepositoryContext(
    plan: GithubPullRequestExecutionPlan,
    env: Record<string, string | undefined>,
    isDryRun: boolean
): GithubRuntimeRepositoryVerificationResult {
    const runtimeRepoStr = env.GITHUB_REPOSITORY;

    if (!runtimeRepoStr) {
        return {
            repositoryContextVerified: false,
            advisory: 'GITHUB_REPOSITORY not found in environment'
        };
    }

    const parsedRuntime = parseGithubRepositoryHint(runtimeRepoStr);
    
    if (!parsedRuntime) {
        return {
            repositoryContextVerified: false,
            runtimeRepository: runtimeRepoStr,
            advisory: 'GITHUB_REPOSITORY environment variable is malformed'
        };
    }

    const runtimeCanonical = `${parsedRuntime.repositoryNamespace}/${parsedRuntime.repositoryName}`.toLowerCase();
    const planCanonical = `${plan.repository.repositoryNamespace}/${plan.repository.repositoryName}`.toLowerCase();

    if (runtimeCanonical !== planCanonical) {
        const isAdvisoryOnly = isDryRun && plan.repositoryIdentityAdvisory;
        
        if (isAdvisoryOnly) {
            return {
                repositoryContextVerified: false,
                runtimeRepository: runtimeRepoStr,
                advisory: 'repository_identity_mismatch_with_runtime_context (advisory-only in dry-run)'
            };
        } else {
            return {
                repositoryContextVerified: false,
                runtimeRepository: runtimeRepoStr,
                refusalReason: REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH
            };
        }
    }

    return {
        repositoryContextVerified: true,
        runtimeRepository: runtimeRepoStr
    };
}
