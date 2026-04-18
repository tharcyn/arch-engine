export interface EnforcementTargetAdapter {
    readonly targetId: string;
}

export class DeploymentGateAdapter {
    static evaluateBeforeDeploy(): string { return 'deployment-allowed'; }
}

export class ClusterAdmissionAdapter {
    static evaluateBeforeClusterApply(): string { return 'cluster-apply-allowed'; }
}

export class RepoTopologyGateAdapter {
    static evaluateBeforeMerge(): string { return 'merge-allowed'; }
}

export class SchemaRegistryGateAdapter {
    static evaluateBeforeSchemaChange(): string { return 'schema-change-allowed'; }
}
