export class GovernanceWorkflowRuntime {
    static startWorkflow(): string { return 'workflow-started'; }
    static listWorkflows(): string { return 'workflow-list'; }
    static inspectWorkflow(): string { return 'workflow-inspected'; }
}

export interface WorkflowExecutionContext {
    readonly contextId: string;
}

export interface WorkflowTriggerDescriptor {
    readonly triggerId: string;
}

export interface WorkflowStageDescriptor {
    readonly stageId: string;
}

export class WorkflowDependencyGraph {}

export class WorkflowTriggerResolver {
    static listTriggers(): string { return 'trigger-list'; }
}

export class PolicyFindingTrigger {}
export class DatasetChangeTrigger {}
export class CapabilityIntersectionTrigger {}
export class RegistryMutationTrigger {}
export class SimulationForecastTrigger {}

export function simulateWorkflowExecution(): string {
    return 'workflow-simulated';
}
