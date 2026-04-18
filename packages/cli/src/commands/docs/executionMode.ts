export async function executionModesListCommand(options: any) {
    const list = ['single-provider', 'multi-provider', 'multi-provider-federated', 'offline', 'bundle-only'];
    if (options.json) console.log(JSON.stringify(list, null, 2));
    else console.log(list.join('\
'));
}

export async function executionModesExplainCommand(modeId: string, options: any) {
    const doc = {
        modeId,
        modeDescription: 'Executes against isolated contexts',
        providerCompatibilityRules: ['single', 'federated'],
        federationEligibility: modeId.includes('federated'),
        bundleCompatibility: true,
        offlineCompatibility: true,
        lockfileCompatibility: true,
        datasetCompatibilityExpectations: ['schema-v1']
    };
    if (options.json) console.log(JSON.stringify(doc, null, 2));
    else console.log(JSON.stringify(doc, null, 2));
}
