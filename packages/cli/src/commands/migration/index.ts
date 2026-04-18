import { TopologyMigrationPlanner, MigrationCampaignRuntime } from '../../../../migration/src/index.js';

export async function migrationPlanCommand(options: any) {
    const result = { status: TopologyMigrationPlanner.planMigration() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function migrationCampaignStartCommand(options: any) {
    const result = { status: MigrationCampaignRuntime.startCampaign() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function migrationCampaignInspectCommand(options: any) {
    const result = { status: MigrationCampaignRuntime.inspectCampaign() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function simulateMigrationCampaignCommand(options: any) {
    const { simulateMigrationCampaign } = await import('../../../../migration/src/index.js');
    const result = { status: simulateMigrationCampaign() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
