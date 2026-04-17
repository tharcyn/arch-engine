import type { AdapterExecutionResultBase } from '@arch-engine/adapter-shared';

export interface GitlabMergeRequestExecutionResult extends AdapterExecutionResultBase {
    readonly pullRequestCreated: boolean;
    readonly existingPullRequestDetected: boolean;
    readonly existingPullRequestNumber?: number;
    readonly existingPullRequestUrl?: string;
    readonly pullRequestNumber?: number;
    readonly pullRequestUrl?: string;
    readonly commitSha?: string;
}
