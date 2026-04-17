export interface GitlabMergeRequestDetectionResult {
    existingPullRequestDetected: boolean;
    existingPullRequestNumber?: number;
    existingPullRequestUrl?: string;
}

export async function findExistingGitlabMergeRequestForBranch(
    repositoryNamespace: string,
    repositoryName: string,
    branchName: string,
    targetBaseBranch: string,
    gitlabClient: any // Using 'any' for the API client since it's injected/mocked from @gitbeaker/rest
): Promise<GitlabMergeRequestDetectionResult> {
    const projectId = `${repositoryNamespace}/${repositoryName}`;
    
    // Note: GitLab's API requires URI encoding for project IDs containing slashes
    const encodedProjectId = encodeURIComponent(projectId);

    try {
        const mergeRequests = await gitlabClient.MergeRequests.all({
            projectId: encodedProjectId,
            state: 'opened',
            sourceBranch: branchName,
            targetBranch: targetBaseBranch
        });

        if (mergeRequests && mergeRequests.length > 0) {
            // Found existing MR
            const mr = mergeRequests[0];
            return {
                existingPullRequestDetected: true,
                existingPullRequestNumber: mr.iid, // Use iid for project-specific identifier
                existingPullRequestUrl: mr.web_url
            };
        }

        return {
            existingPullRequestDetected: false
        };
    } catch (e: any) {
        // If it's a 404, the project might not exist or the token lacks access, 
        // but for detection purposes we treat it as not found.
        return {
            existingPullRequestDetected: false
        };
    }
}
