export function generateBundleConfig(packId: string) {
    return `export default {
    packId: '${packId}',
    targetRegistry: 'default',
    signatureRequired: false,
    buildCapabilities: ['A'],
    buildDatasetSchemas: ['schema-v1']
};
`;
}

export function validateBundleCompatibility(config: any): boolean {
    if (!config.packId) throw new Error('Missing packId in bundle config');
    return true;
}

export function prepareBundlePublishingDescriptor(registryId: string, catalogId: string) {
    return {
        targetRegistryId: registryId,
        targetCatalogId: catalogId,
        publishStrategy: 'replace-if-hash-match',
        signatureRequirement: 'none',
        promotionStage: 'development',
        mirrorPropagationPolicy: 'do-not-propagate',
        catalogMutationMode: 'strict-parity'
    };
}
