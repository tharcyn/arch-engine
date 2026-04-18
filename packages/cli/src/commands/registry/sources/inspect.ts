import { 
    RegistrySourceDescriptor, 
    RegistryCatalogManifest,
    resolveRegistrySources
} from '@arch-engine/core';

// Mock context for CLI demo
const MOCK_SOURCES: RegistrySourceDescriptor[] = [
    {
        registrySourceId: 'local-default',
        registrySourceType: 'local',
        registrySourcePriority: 1,
        registryTrustLevel: 'verified-internal',
        catalogLocation: '/var/lib/arch-engine/catalog.json',
        catalogFormatVersion: '1',
        signatureRequirement: 'none'
    },
    {
        registrySourceId: 'organization-mirror',
        registrySourceType: 'remote-catalog',
        registrySourcePriority: 2,
        registryTrustLevel: 'verified-ecosystem',
        catalogLocation: 'https://registry.example.com/catalog.json',
        catalogFormatVersion: '1',
        signatureRequirement: 'required'
    }
];

const MOCK_CATALOGS = new Map<string, RegistryCatalogManifest>();
MOCK_CATALOGS.set('local-default', {
    catalogId: 'local-default',
    catalogVersion: '1.0.0',
    catalogGeneratedAtExcludedFromHash: '2026-04-18T00:00:00Z',
    policyPacks: [],
    catalogSignature: null,
    catalogHash: 'mock-hash-1'
});
MOCK_CATALOGS.set('organization-mirror', {
    catalogId: 'organization-mirror',
    catalogVersion: '1.1.0',
    catalogGeneratedAtExcludedFromHash: '2026-04-18T00:00:00Z',
    policyPacks: [],
    catalogSignature: 'valid-sig-ecosystem-key',
    catalogHash: 'mock-hash-2'
});

export async function registrySourcesInspectCommand(sourceId: string, options: any): Promise<number> {
    const source = MOCK_SOURCES.find(s => s.registrySourceId === sourceId);
    
    if (!source) {
        if (options.json) {
            console.log(JSON.stringify({ error: `Source ${sourceId} not found.` }));
        } else {
            console.error(`❌ Source ${sourceId} not configured.`);
        }
        return 4; // catalog mismatch / not found proxy
    }

    const catalog = MOCK_CATALOGS.get(sourceId) || null;

    if (options.json) {
        console.log(JSON.stringify({ source, catalog }, null, 2));
        return 0;
    }

    console.log(`\n🔍 Inspecting Registry Source: ${source.registrySourceId}\n`);
    console.log(`Type: ${source.registrySourceType}`);
    console.log(`Priority: ${source.registrySourcePriority}`);
    console.log(`Trust Level: ${source.registryTrustLevel}`);
    console.log(`Signature Requirement: ${source.signatureRequirement}`);
    
    if (catalog) {
        console.log(`\nCatalog Version: ${catalog.catalogVersion}`);
        console.log(`Catalog Hash: ${catalog.catalogHash}`);
        console.log(`Available Packs: ${catalog.policyPacks.length}`);
    } else {
        console.log(`\nCatalog: MISSING or UNREACHABLE`);
    }
    
    console.log('');
    return 0;
}
