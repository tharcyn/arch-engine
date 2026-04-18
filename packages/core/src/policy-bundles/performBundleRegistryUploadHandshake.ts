import type { ArchPolicyPackBundleFormat } from './ArchPolicyPackBundleFormat.js';
import type { BundlePublishingDescriptor } from './BundlePublishingDescriptor.js';
import type { RegistryCatalogManifest } from '../policy-registry/RegistryCatalogManifest.js';
import { verifyPolicyPackBundleSignature } from './verifyPolicyPackBundleSignature.js';
import { createHash } from 'crypto';

export interface BundleUploadHandshakeResult {
    readonly uploadPermitted: boolean;
    readonly catalogCompatible: boolean;
    readonly signatureSatisfied: boolean;
    readonly mutationAllowed: boolean;
    readonly handshakeDiagnostics: readonly string[];
}

export function performBundleRegistryUploadHandshake(
    bundle: ArchPolicyPackBundleFormat,
    descriptor: BundlePublishingDescriptor,
    targetCatalog: RegistryCatalogManifest | null
): BundleUploadHandshakeResult {
    const diagnostics: string[] = [];
    let catalogCompatible = true;
    let signatureSatisfied = true;
    let mutationAllowed = true;

    // 1. Signature boundary
    const sigResult = verifyPolicyPackBundleSignature(bundle, descriptor.signatureRequirement);
    if (!sigResult.signatureValid) {
        signatureSatisfied = false;
        diagnostics.push(`Signature verification failed: ${sigResult.verificationDiagnostics.join(' ')}`);
    }

    // Decode bundle for deeper checks
    let manifest: any;
    try {
        const payloadStr = Buffer.from(bundle.bundlePayload, 'base64').toString('utf-8');
        manifest = JSON.parse(payloadStr);
    } catch (e) {
        diagnostics.push('Failed to parse bundle payload during handshake.');
        return {
            uploadPermitted: false,
            catalogCompatible: false,
            signatureSatisfied,
            mutationAllowed: false,
            handshakeDiagnostics: diagnostics
        };
    }

    // 2. Target Catalog Mutation Checks
    if (targetCatalog) {
        if (targetCatalog.catalogId !== descriptor.targetCatalogId) {
            catalogCompatible = false;
            diagnostics.push(`Target catalog ID mismatch. Expected ${descriptor.targetCatalogId}, found ${targetCatalog.catalogId}.`);
        }

        // Check if bundle versions already exist and apply publish strategy
        const bundlePacks = manifest.includedPolicyPacks || [];
        for (const pack of bundlePacks) {
            const existingEntry = targetCatalog.policyPacks.find(p => p.policyPackId === pack.policyPackId);
            if (existingEntry && existingEntry.availableVersions.includes(pack.policyPackVersion)) {
                // The version already exists in the catalog.
                if (descriptor.publishStrategy === 'reject-if-exists' || descriptor.publishStrategy === 'append-only') {
                    mutationAllowed = false;
                    diagnostics.push(`Pack ${pack.policyPackId}@${pack.policyPackVersion} already exists. Strategy ${descriptor.publishStrategy} rejects mutation.`);
                } else if (descriptor.publishStrategy === 'replace-if-hash-match') {
                    // Check if hash matches
                    const existingManifestHash = existingEntry.manifestHashPerVersion[pack.policyPackVersion];
                    const packHash = createHash('sha256').update(JSON.stringify(pack)).digest('hex');
                    if (existingManifestHash !== packHash) {
                        mutationAllowed = false;
                        diagnostics.push(`Pack ${pack.policyPackId}@${pack.policyPackVersion} exists with different hash. Cannot replace.`);
                    }
                }
                // append-with-version-check allows overwriting if version checks pass natively (handled in mutator)
            }
        }
    } else {
        // Target catalog doesn't exist yet, implicitly allowed
        diagnostics.push('Target catalog does not exist yet. Upload initializes catalog.');
    }

    const uploadPermitted = catalogCompatible && signatureSatisfied && mutationAllowed;
    if (uploadPermitted) {
        diagnostics.push('Upload handshake successful. Bundle permitted for catalog mutation.');
    }

    return {
        uploadPermitted,
        catalogCompatible,
        signatureSatisfied,
        mutationAllowed,
        handshakeDiagnostics: diagnostics
    };
}
