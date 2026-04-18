export class GitProviderHookAdapter {
    static applyGitProviderHook(): string {
        return 'git-hook-allowed';
    }
}

export class MergeGateHook {}
export class BranchProtectionHook {}
export class TopologyBoundaryHook {}
