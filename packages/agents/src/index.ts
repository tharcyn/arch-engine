export class RemediationAgentRuntime {
    static startAgent(): string { return 'agent-started'; }
    static planAgent(): string { return 'agent-planned'; }
    static applyAgent(): string { return 'agent-applied'; }
    static previewAgent(): string { return 'agent-previewed'; }
}

export class PolicyFixExecutor {}
export class TopologyRepairExecutor {}
export class DatasetCompatibilityRepairExecutor {}
export class AuthorityBoundaryRepairExecutor {}
export class IdentityCollisionRepairExecutor {}

export function computeRepairPlanFromFindings(): string {
    return 'repair-plan-computed';
}
