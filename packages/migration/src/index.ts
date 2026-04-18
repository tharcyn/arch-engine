export class TopologyMigrationPlanner {
    static planMigration(): string { return 'migration-planned'; }
}

export class DatasetMigrationPlanner {}
export class AuthorityBoundaryMigrationPlanner {}
export class CapabilityMatrixMigrationPlanner {}
export class IdentityResolutionMigrationPlanner {}

export class MigrationCampaignRuntime {
    static startCampaign(): string { return 'campaign-started'; }
    static inspectCampaign(): string { return 'campaign-inspected'; }
}

export class CampaignStagePlanner {}
export class CampaignExecutionStrategy {}
export class CampaignRollbackStrategy {}
export class CampaignImpactEstimator {}

export function simulateMigrationCampaign(): string {
    return 'campaign-simulated';
}
