import type { RegistrySourceDescriptor } from './RegistrySourceDescriptor.js';
import type { RegistryCatalogManifest } from './RegistryCatalogManifest.js';
import type { ArchPolicyPackBundleFormat } from '../policy-bundles/ArchPolicyPackBundleFormat.js';
import { mutateRegistryCatalogDeterministically } from './mutateRegistryCatalogDeterministically.js';

export interface MirrorPropagationResult {
    readonly propagationSuccessful: boolean;
    readonly propagatedMirrors: readonly string[];
    readonly failedMirrors: readonly string[];
    readonly propagationDiagnostics: readonly string[];
}

export function propagateBundleAcrossMirrors(
    bundle: ArchPolicyPackBundleFormat,
    targetMirrors: readonly RegistrySourceDescriptor[],
    currentCatalogs: Map<string, RegistryCatalogManifest> // mapped by registrySourceId
): MirrorPropagationResult {
    const diagnostics: string[] = [];
    const propagated: string[] = [];
    const failed: string[] = [];

    // Sort mirrors deterministically
    const sortedMirrors = [...targetMirrors].sort((a, b) => a.registrySourceId.localeCompare(b.registrySourceId));

    for (const mirror of sortedMirrors) {
        if (mirror.registryTrustLevel === 'unverified') {
            failed.push(mirror.registrySourceId);
            diagnostics.push(`Mirror ${mirror.registrySourceId} rejected: trust level is unverified.`);
            continue;
        }

        const currentCatalog = currentCatalogs.get(mirror.registrySourceId) || null;
        
        const mutationResult = mutateRegistryCatalogDeterministically(currentCatalog, bundle, mirror.registrySourceId);

        if (mutationResult.mutationSuccessful) {
            propagated.push(mirror.registrySourceId);
            diagnostics.push(`Successfully propagated bundle payload to mirror ${mirror.registrySourceId}.`);
        } else {
            failed.push(mirror.registrySourceId);
            diagnostics.push(`Propagation to mirror ${mirror.registrySourceId} failed: ${mutationResult.mutationDiagnostics.join(' ')}`);
        }
    }

    return {
        propagationSuccessful: failed.length === 0,
        propagatedMirrors: propagated,
        failedMirrors: failed,
        propagationDiagnostics: diagnostics
    };
}
