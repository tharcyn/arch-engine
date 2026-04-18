import { createHash } from 'crypto';
import type { RegistryCatalogManifest, CatalogPolicyPackEntry } from './RegistryCatalogManifest.js';
import type { ArchPolicyPackBundleFormat } from '../policy-bundles/ArchPolicyPackBundleFormat.js';

export interface CatalogMutationResult {
    readonly mutationSuccessful: boolean;
    readonly mutatedCatalog: RegistryCatalogManifest | null;
    readonly mutationDiagnostics: readonly string[];
}

function hashJSON(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export function mutateRegistryCatalogDeterministically(
    currentCatalog: RegistryCatalogManifest | null,
    bundle: ArchPolicyPackBundleFormat,
    catalogId: string
): CatalogMutationResult {
    const diagnostics: string[] = [];

    let manifest: any;
    try {
        const payloadStr = Buffer.from(bundle.bundlePayload, 'base64').toString('utf-8');
        manifest = JSON.parse(payloadStr);
    } catch (e) {
        diagnostics.push('Failed to parse bundle payload.');
        return { mutationSuccessful: false, mutatedCatalog: null, mutationDiagnostics: diagnostics };
    }

    const packsToInsert = manifest.includedPolicyPacks || [];
    
    // Map existing packs
    const packMap = new Map<string, CatalogPolicyPackEntry>();
    if (currentCatalog) {
        for (const p of currentCatalog.policyPacks) {
            packMap.set(p.policyPackId, p);
        }
    }

    // Mutate map
    for (const pack of packsToInsert) {
        const pId = pack.policyPackId;
        const pVer = pack.policyPackVersion;
        const packHash = hashJSON(pack);
        
        let entry = packMap.get(pId);
        if (!entry) {
            entry = {
                policyPackId: pId,
                availableVersions: [],
                manifestHashPerVersion: {},
                dependencyGraphHashPerVersion: {}
            };
            packMap.set(pId, entry);
        }

        // Insert version
        const versions = new Set(entry.availableVersions);
        versions.add(pVer);
        
        entry = {
            ...entry,
            availableVersions: Array.from(versions).sort((a, b) => b.localeCompare(a)), // descending
            manifestHashPerVersion: {
                ...entry.manifestHashPerVersion,
                [pVer]: packHash
            },
            dependencyGraphHashPerVersion: {
                ...entry.dependencyGraphHashPerVersion,
                [pVer]: bundle.bundleDependencyGraphHash // We tie this specific bundle's dep graph hash
            }
        };

        packMap.set(pId, entry);
        diagnostics.push(`Inserted/Updated pack ${pId}@${pVer} into catalog.`);
    }

    // Reconstruct catalog deterministically
    const sortedPacks = Array.from(packMap.values()).sort((a, b) => a.policyPackId.localeCompare(b.policyPackId));

    const newCatalogWithoutHash: Omit<RegistryCatalogManifest, 'catalogHash'> = {
        catalogId,
        catalogVersion: currentCatalog ? currentCatalog.catalogVersion : '1.0.0', // simplified versioning
        catalogGeneratedAtExcludedFromHash: new Date().toISOString(),
        policyPacks: sortedPacks,
        catalogSignature: currentCatalog ? currentCatalog.catalogSignature : null,
    };

    const mutatedCatalog: RegistryCatalogManifest = {
        ...newCatalogWithoutHash,
        catalogHash: hashJSON({ ...newCatalogWithoutHash, catalogGeneratedAtExcludedFromHash: '' })
    };

    diagnostics.push('Catalog mutation deterministic reconstruction complete.');

    return {
        mutationSuccessful: true,
        mutatedCatalog,
        mutationDiagnostics: diagnostics
    };
}
