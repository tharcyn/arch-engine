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

export async function registrySourcesListCommand(options: any): Promise<number> {
    const resolved = resolveRegistrySources(MOCK_SOURCES, MOCK_CATALOGS);

    if (options.json) {
        console.log(JSON.stringify(resolved, null, 2));
        return 0;
    }

    console.log(`\n📚 --- Registry Sources --- 📚\n`);
    
    console.log(`✅ Resolved Sources (${resolved.resolvedSources.length}):`);
    resolved.resolvedSources.forEach(s => {
        console.log(`  - ${s.registrySourceId} [${s.registrySourceType}] (Priority: ${s.registrySourcePriority}, Trust: ${s.registryTrustLevel})`);
    });

    if (resolved.blockedSources.length > 0) {
        console.log(`\n❌ Blocked Sources (${resolved.blockedSources.length}):`);
        resolved.blockedSources.forEach(s => {
            console.log(`  - ${s.registrySourceId}`);
        });
    }

    if (resolved.resolutionDiagnostics.length > 0) {
        console.log(`\nDiagnostics:`);
        resolved.resolutionDiagnostics.forEach(d => console.log(`  > ${d}`));
    }
    
    console.log('');
    return 0;
}
