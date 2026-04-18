export async function simulateMigrationCampaignCommand(options: any) {
    const { simulateMigrationCampaign } = await import('../../../../migration/src/index.js');
    const result = { status: simulateMigrationCampaign() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
