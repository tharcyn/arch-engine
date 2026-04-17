import { Octokit } from '@octokit/rest';
import type { GithubPullRequestExecutionPlan } from './buildGithubPullRequestPlan.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import * as fs from 'fs';
import * as path from 'path';
import { verifyGithubRuntimeRepositoryContext } from './verifyGithubRuntimeRepositoryContext.js';
import type { GithubPullRequestExecutionResult } from './types/GithubPullRequestExecutionResult.js';
import { findExistingGithubPullRequestForBranch } from './findExistingGithubPullRequestForBranch.js';

export type ExecuteGithubPullRequestPlanOptions = {
    execute?: boolean;
    githubToken?: string;
};

export async function executeGithubPullRequestPlan(
    plan: GithubPullRequestExecutionPlan,
    options?: ExecuteGithubPullRequestPlanOptions
): Promise<GithubPullRequestExecutionResult> {
    const isDryRun = !(options?.execute === true);
    const executionMode: 'dry-run' | 'execute' = isDryRun ? 'dry-run' : 'execute';

    const verification = verifyGithubRuntimeRepositoryContext(plan, process.env, isDryRun);
    
    const baseResult = {
        executionMode,
        executionPerformed: false,
        repositoryContextVerified: verification.repositoryContextVerified,
        runtimeRepository: verification.runtimeRepository,
        repositoryIdentityAdvisory: plan.repositoryIdentityAdvisory,
        branchName: plan.branchName,
        branchCreated: false,
        branchReused: false,
        commitCreated: false,
        pullRequestCreated: false,
        existingPullRequestDetected: false,
    };

    if (verification.refusalReason) {
        return {
            ...baseResult,
            adapterOutcome: 'refused',
            refusalReason: verification.refusalReason
        };
    }

    if (isDryRun) {
        return {
            ...baseResult,
            adapterOutcome: 'dry-run'
        };
    }

    const token = options?.githubToken || process.env.GITHUB_TOKEN;
    if (!token) {
        return {
            ...baseResult,
            adapterOutcome: 'refused',
            refusalReason: REFUSAL_REASONS.MISSING_GITHUB_TOKEN
        };
    }

    const octokit = new Octokit({ auth: token });
    const { repositoryNamespace: owner, repositoryName: repo } = plan.repository;

    try {
        const baseRefResponse = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${plan.targetBaseBranch}`,
        });
        const baseSha = baseRefResponse.data.object.sha;

        const baseCommitResponse = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: baseSha,
        });
        const baseTreeSha = baseCommitResponse.data.tree.sha;

        const treeEntries = plan.changedPaths.map(filePath => {
            const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
            return {
                path: filePath,
                mode: '100644' as const,
                type: 'blob' as const,
                content
            };
        });

        const treeResponse = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: treeEntries
        });

        const commitResponse = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: plan.commitMessage,
            tree: treeResponse.data.sha,
            parents: [baseSha]
        });

        const newCommitSha = commitResponse.data.sha;

        let branchCreated = false;
        let branchReused = false;
        try {
            await octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${plan.branchName}`,
                sha: newCommitSha
            });
            branchCreated = true;
        } catch (e: any) {
            if (e.status === 422) {
                // Branch already exists, reuse it safely
                await octokit.rest.git.updateRef({
                    owner,
                    repo,
                    ref: `heads/${plan.branchName}`,
                    sha: newCommitSha,
                    force: true
                });
                branchCreated = false;
                branchReused = true;
            } else {
                throw e;
            }
        }

        const prDetection = await findExistingGithubPullRequestForBranch(
            owner,
            repo,
            plan.branchName,
            plan.targetBaseBranch,
            octokit
        );

        if (prDetection.existingPullRequestDetected) {
            return {
                ...baseResult,
                adapterOutcome: 'pr-reused',
                executionPerformed: true,
                branchCreated,
                branchReused,
                commitCreated: true,
                commitSha: newCommitSha,
                pullRequestCreated: false,
                existingPullRequestDetected: true,
                existingPullRequestNumber: prDetection.pullRequestNumber,
                existingPullRequestUrl: prDetection.pullRequestUrl
            };
        }

        const prResponse = await octokit.rest.pulls.create({
            owner,
            repo,
            title: plan.pullRequestTitle,
            body: plan.pullRequestBody,
            head: plan.branchName,
            base: plan.targetBaseBranch
        });

        return {
            ...baseResult,
            adapterOutcome: 'pr-created',
            executionPerformed: true,
            branchCreated,
            branchReused,
            commitCreated: true,
            commitSha: newCommitSha,
            pullRequestCreated: true,
            pullRequestUrl: prResponse.data.html_url,
            pullRequestNumber: prResponse.data.number,
            existingPullRequestDetected: false
        };

    } catch (e: any) {
        return {
            ...baseResult,
            adapterOutcome: 'refused',
            refusalReason: REFUSAL_REASONS.OCTOKIT_EXECUTION_FAILED
        };
    }
}
