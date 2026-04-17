import type { Octokit } from '@octokit/rest';

export interface FindExistingGithubPullRequestResult {
    existingPullRequestDetected: boolean;
    pullRequestNumber?: number;
    pullRequestUrl?: string;
}

export async function findExistingGithubPullRequestForBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string,
    octokit: Octokit
): Promise<FindExistingGithubPullRequestResult> {
    const headParam = `${owner}:${branchName}`;
    
    try {
        const response = await octokit.rest.pulls.list({
            owner,
            repo,
            head: headParam,
            base: baseBranch,
            state: 'open'
        });

        if (response.data.length > 0) {
            const pr = response.data[0];
            return {
                existingPullRequestDetected: true,
                pullRequestNumber: pr.number,
                pullRequestUrl: pr.html_url
            };
        }

        return {
            existingPullRequestDetected: false
        };
    } catch (e: any) {
        // If lookup fails due to permissions or networking, let it bubble
        throw e;
    }
}
