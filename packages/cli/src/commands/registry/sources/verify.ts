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

export async function registrySourcesVerifyCommand(sourceId: string, options: any): Promise<number> {
    const source = MOCK_SOURCES.find(s => s.registrySourceId === sourceId);
    
    if (!source) {
        if (options.json) {
            console.log(JSON.stringify({ error: `Source ${sourceId} not found.` }));
        } else {
            console.error(`❌ Source ${sourceId} not found.`);
        }
        return 4; // proxy for catalog mismatch
    }

    const resolved = resolveRegistrySources([source], MOCK_CATALOGS);
    
    if (options.json) {
        console.log(JSON.stringify(resolved, null, 2));
    }

    if (resolved.signatureFailures.length > 0) {
        if (!options.json) console.error(`❌ Signature Verification Failed for ${sourceId}`);
        return 1;
    }
    
    if (resolved.schemaFailures.length > 0) {
        if (!options.json) console.error(`❌ Schema Incompatibility for ${sourceId}`);
        return 2;
    }

    if (resolved.trustFailures.length > 0) {
        if (!options.json) console.error(`❌ Trust Violation for ${sourceId}`);
        return 3;
    }

    if (resolved.blockedSources.length > 0) {
        if (!options.json) console.error(`❌ Source ${sourceId} blocked for unknown reasons.`);
        return 4;
    }

    if (!options.json) console.log(`✅ Source ${sourceId} successfully verified.`);
    return 0;
}
