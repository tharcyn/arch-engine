import { describe, test, expect } from 'vitest';
import { performBundleRegistryUploadHandshake } from '../../src/policy-bundles/performBundleRegistryUploadHandshake.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';
import type { BundlePublishingDescriptor } from '../../src/policy-bundles/BundlePublishingDescriptor.js';

describe('Bundle Upload Handshake Contract', () => {
    test('enforces upload parity and validation correctly', () => {
        const bundle: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test-bundle',
            bundleCreatedAtExcludedFromHash: '',
            bundleManifestHash: '',
            bundleDependencyGraphHash: '',
            bundleCapabilitySnapshotHash: '',
            bundleDatasetCompatibilitySnapshotHash: '',
            bundleExecutionModeSnapshotHash: '',
            bundleSignature: null,
            bundlePayload: Buffer.from(JSON.stringify({
                includedPolicyPacks: [{ policyPackId: 'alpha', policyPackVersion: '1.0.0' }]
            })).toString('base64')
        };

        const descriptor: BundlePublishingDescriptor = {
            targetRegistryId: 'primary',
            targetCatalogId: 'cat-1',
            publishStrategy: 'reject-if-exists',
            signatureRequirement: 'required',
            promotionStage: 'development',
            mirrorPropagationPolicy: 'do-not-propagate',
            catalogMutationMode: 'strict-parity'
        };

        const result = performBundleRegistryUploadHandshake(bundle, descriptor, null);

        expect(result).toMatchInlineSnapshot(`
          {
            "catalogCompatible": true,
            "handshakeDiagnostics": [
              "Signature verification failed: Required signature is missing from bundle.",
              "Target catalog does not exist yet. Upload initializes catalog.",
            ],
            "mutationAllowed": true,
            "signatureSatisfied": false,
            "uploadPermitted": false,
          }
        `);
    });
});
