import { parseGitlabRepositoryHint } from './parseGitlabRepositoryHint.js';
import type { GitlabMergeRequestExecutionPlan } from './types/GitlabMergeRequestExecutionPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';

export interface GitlabRuntimeRepositoryVerificationResult {
    repositoryContextVerified: boolean;
    runtimeRepository?: string;
    refusalReason?: string;
    advisory?: string;
}

export function verifyGitlabRuntimeRepositoryContext(
    plan: GitlabMergeRequestExecutionPlan,
    env: Record<string, string | undefined>,
    isDryRun: boolean
): GitlabRuntimeRepositoryVerificationResult {
    // GitLab uses CI_PROJECT_PATH for full namespace/project
    const runtimeRepoStr = env.CI_PROJECT_PATH;

    if (!runtimeRepoStr) {
        return {
            repositoryContextVerified: false,
            advisory: 'CI_PROJECT_PATH not found in environment'
        };
    }

    const parsedRuntime = parseGitlabRepositoryHint(runtimeRepoStr);
    
    if (!parsedRuntime) {
        return {
            repositoryContextVerified: false,
            runtimeRepository: runtimeRepoStr,
            advisory: 'CI_PROJECT_PATH environment variable is malformed'
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
