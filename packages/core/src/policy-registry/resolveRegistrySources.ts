import type { RegistrySourceDescriptor } from './RegistrySourceDescriptor.js';
import type { RegistryCatalogManifest } from './RegistryCatalogManifest.js';
import { verifyRegistryCatalogSignature } from './verifyRegistryCatalogSignature.js';

export interface ResolvedRegistrySourceSet {
    readonly resolvedSources: readonly RegistrySourceDescriptor[];
    readonly blockedSources: readonly RegistrySourceDescriptor[];
    readonly signatureFailures: readonly RegistrySourceDescriptor[];
    readonly schemaFailures: readonly RegistrySourceDescriptor[];
    readonly trustFailures: readonly RegistrySourceDescriptor[];
    readonly resolutionDiagnostics: readonly string[];
}

function getTrustWeight(trust: string): number {
    if (trust === 'verified-internal') return 3;
    if (trust === 'verified-ecosystem') return 2;
    if (trust === 'unverified') return 1;
    return 0;
}

export function resolveRegistrySources(
    sources: readonly RegistrySourceDescriptor[],
    catalogs: Map<string, RegistryCatalogManifest>, // mapped by registrySourceId
    requiredTrustLevel: 'verified-internal' | 'verified-ecosystem' | 'unverified' = 'unverified'
): ResolvedRegistrySourceSet {
    const resolved: RegistrySourceDescriptor[] = [];
    const blocked: RegistrySourceDescriptor[] = [];
    const signatureFailures: RegistrySourceDescriptor[] = [];
    const schemaFailures: RegistrySourceDescriptor[] = [];
    const trustFailures: RegistrySourceDescriptor[] = [];
    const diagnostics: string[] = [];

    // Sort deterministically:
    // 1. Priority ascending
    // 2. Trust level descending
    // 3. ID alphabetical
    const sortedSources = [...sources].sort((a, b) => {
        if (a.registrySourcePriority !== b.registrySourcePriority) {
            return a.registrySourcePriority - b.registrySourcePriority;
        }
        
        const trustA = getTrustWeight(a.registryTrustLevel);
        const trustB = getTrustWeight(b.registryTrustLevel);
        if (trustA !== trustB) {
            return trustB - trustA;
        }

        return a.registrySourceId.localeCompare(b.registrySourceId);
    });

    const requiredTrustWeight = getTrustWeight(requiredTrustLevel);

    for (const source of sortedSources) {
        if (getTrustWeight(source.registryTrustLevel) < requiredTrustWeight) {
            trustFailures.push(source);
            blocked.push(source);
            diagnostics.push(`Source ${source.registrySourceId} blocked: Insufficient trust level.`);
            continue;
        }

        if (source.catalogFormatVersion !== '1') {
            schemaFailures.push(source);
            blocked.push(source);
            diagnostics.push(`Source ${source.registrySourceId} blocked: Unsupported catalog format version ${source.catalogFormatVersion}`);
            continue;
        }

        const catalog = catalogs.get(source.registrySourceId);
        if (!catalog) {
            diagnostics.push(`Source ${source.registrySourceId} skipped: Catalog manifest missing or unreachable.`);
            continue;
        }

        const sigResult = verifyRegistryCatalogSignature(
            catalog.catalogHash, 
            catalog.catalogSignature, 
            source.signatureRequirement
        );

        if (!sigResult.signatureValid) {
            signatureFailures.push(source);
            blocked.push(source);
            diagnostics.push(`Source ${source.registrySourceId} blocked: Signature verification failed.`);
            continue;
        }

        resolved.push(source);
        diagnostics.push(`Source ${source.registrySourceId} resolved successfully.`);
    }

    return {
        resolvedSources: resolved,
        blockedSources: blocked,
        signatureFailures,
        schemaFailures,
        trustFailures,
        resolutionDiagnostics: diagnostics
    };
}
