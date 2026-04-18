export class MultiPartyApprovalWorkflowRuntime {
    static startWorkflow(): string { return 'workflow-started'; }
    static inspectWorkflow(): string { return 'workflow-inspected'; }
}

export class ApprovalStageDescriptor {}
export class ApprovalStageResolver {}
export class SequentialApprovalExecutor {}
export class ParallelApprovalExecutor {}
export class ConditionalApprovalBranchResolver {}
