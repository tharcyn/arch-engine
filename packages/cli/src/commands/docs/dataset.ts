export async function datasetSchemasListCommand(options: any) {
    const list = ['schema-v1', 'schema-v2'];
    if (options.json) console.log(JSON.stringify(list, null, 2));
    else console.log(list.join('\
'));
}

export async function datasetSchemasExplainCommand(schemaId: string, options: any) {
    const doc = {
        schemaId,
        schemaVersion: '1.0.0',
        requiredTopologyNodes: ['NodeA'],
        requiredTopologyEdges: ['EdgeA'],
        compatibilityWithPolicyPackCapabilitySurfaces: ['authority-boundary'],
        federationMergeSemantics: 'strict-union',
        identityResolutionBehavior: 'EXACT_DATASET_REPLAY'
    };
    if (options.json) console.log(JSON.stringify(doc, null, 2));
    else console.log(JSON.stringify(doc, null, 2));
}
