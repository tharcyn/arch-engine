import type { RegistrySourceDescriptor } from './RegistrySourceDescriptor.js';
import type { RegistryCatalogManifest } from './RegistryCatalogManifest.js';

export interface MirrorFallbackResolutionResult {
    readonly resolvedFromMirror: readonly string[]; // packId@version strings
    readonly mirrorFallbackUsed: readonly string[]; // registrySourceIds
    readonly mirrorConflicts: readonly string[];
    readonly mirrorDiagnostics: readonly string[];
}

export function resolveRegistryMirrorFallback(
    requiredPacks: readonly { policyPackId: string; version: string }[],
    primarySourceId: string,
    resolvedSources: readonly RegistrySourceDescriptor[],
    catalogs: Map<string, RegistryCatalogManifest>
): MirrorFallbackResolutionResult {
    const resolvedFromMirror = new Set<string>();
    const mirrorFallbackUsed = new Set<string>();
    const mirrorConflicts: string[] = [];
    const diagnostics: string[] = [];

    const primaryCatalog = catalogs.get(primarySourceId);
    if (!primaryCatalog) {
        diagnostics.push(`Primary catalog ${primarySourceId} not found, relying entirely on mirrors.`);
    }

    // Filter available mirrors (exclude primary)
    const mirrors = resolvedSources.filter(s => s.registrySourceId !== primarySourceId);

    for (const req of requiredPacks) {
        const primaryPack = primaryCatalog?.policyPacks.find(p => p.policyPackId === req.policyPackId);
        if (primaryPack && primaryPack.availableVersions.includes(req.version)) {
            // Found in primary, no fallback needed for this pack version
            continue;
        }

        // Need fallback
        let found = false;
        for (const mirror of mirrors) {
            const mirrorCatalog = catalogs.get(mirror.registrySourceId);
            if (!mirrorCatalog) continue;

            const packEntry = mirrorCatalog.policyPacks.find(p => p.policyPackId === req.policyPackId);
            if (packEntry && packEntry.availableVersions.includes(req.version)) {
                
                // Compare manifest hashes if the pack exists in primary but is missing the specific version
                if (primaryPack) {
                    const primaryHash = primaryPack.manifestHashPerVersion[primaryPack.availableVersions[0]]; // check any known version
                    const mirrorHash = packEntry.manifestHashPerVersion[primaryPack.availableVersions[0]];
                    if (primaryHash && mirrorHash && primaryHash !== mirrorHash) {
                        mirrorConflicts.push(`${req.policyPackId}@${req.version}`);
                        diagnostics.push(`Mirror conflict: ${mirror.registrySourceId} provides tampered manifest base for ${req.policyPackId}`);
                        continue;
                    }
                }

                found = true;
                resolvedFromMirror.add(`${req.policyPackId}@${req.version}`);
                mirrorFallbackUsed.add(mirror.registrySourceId);
                diagnostics.push(`Resolved ${req.policyPackId}@${req.version} from mirror ${mirror.registrySourceId}`);
                break;
            }
        }

        if (!found) {
            diagnostics.push(`Could not resolve ${req.policyPackId}@${req.version} from primary or any mirrors.`);
        }
    }

    return {
        resolvedFromMirror: Array.from(resolvedFromMirror).sort(),
        mirrorFallbackUsed: Array.from(mirrorFallbackUsed).sort(),
        mirrorConflicts: mirrorConflicts.sort(),
        mirrorDiagnostics: diagnostics
    };
}
