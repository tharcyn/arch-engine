import { describe, test, expect } from 'vitest';
import { propagateBundleAcrossMirrors } from '../../src/policy-registry/propagateBundleAcrossMirrors.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';

describe('Mirror Propagation Contract', () => {
    test('propagates to verified mirrors and rejects unverified', () => {
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
            bundlePayload: Buffer.from(JSON.stringify({ includedPolicyPacks: [] })).toString('base64')
        };

        const result = propagateBundleAcrossMirrors(
            bundle,
            [
                {
                    registrySourceId: 'mirror-verified',
                    registrySourceType: 'filesystem-mirror',
                    registrySourcePriority: 1,
                    registryTrustLevel: 'verified-internal',
                    catalogLocation: '',
                    catalogFormatVersion: '1',
                    signatureRequirement: 'none'
                },
                {
                    registrySourceId: 'mirror-evil',
                    registrySourceType: 'filesystem-mirror',
                    registrySourcePriority: 2,
                    registryTrustLevel: 'unverified',
                    catalogLocation: '',
                    catalogFormatVersion: '1',
                    signatureRequirement: 'none'
                }
            ],
            new Map()
        );

        expect(result).toMatchInlineSnapshot(`
          {
            "failedMirrors": [
              "mirror-evil",
            ],
            "propagatedMirrors": [
              "mirror-verified",
            ],
            "propagationDiagnostics": [
              "Mirror mirror-evil rejected: trust level is unverified.",
              "Successfully propagated bundle payload to mirror mirror-verified.",
            ],
            "propagationSuccessful": false,
          }
        `);
    });
});
