import type { AdapterExecutionResultBase } from '@arch-engine/adapter-shared';

export interface GithubPullRequestExecutionResult extends AdapterExecutionResultBase {
    readonly commitCreated: boolean;
    readonly pullRequestCreated: boolean;
    
    // Remote payload data
    readonly commitSha?: string;
    readonly pullRequestNumber?: number;
    readonly pullRequestUrl?: string;

    // Existing PR data
    readonly existingPullRequestDetected: boolean;
    readonly existingPullRequestNumber?: number;
    readonly existingPullRequestUrl?: string;
}
