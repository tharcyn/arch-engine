export interface GitlabMergeRequestExecutionPlan {
    readonly repository: {
        readonly repositoryNamespace: string;
        readonly repositoryName: string;
    };
    readonly branchName: string;
    readonly commitMessage: string;
    readonly mergeRequestTitle: string;
    readonly mergeRequestDescription: string;
    readonly targetBaseBranch: string;
    readonly changedPaths: readonly string[];
    readonly authoritative: boolean;
    readonly integrityHash: string;
    readonly producerIdentity: string;
    readonly payloadSchemaVersion: string;
    repositoryIdentityAdvisory: boolean;
}
