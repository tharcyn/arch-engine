import { describe, test, expect } from 'vitest';
import { mutateRegistryCatalogDeterministically } from '../../src/policy-registry/mutateRegistryCatalogDeterministically.js';
import type { RegistryCatalogManifest } from '../../src/policy-registry/RegistryCatalogManifest.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';

describe('Catalog Mutation Contract', () => {
    test('mutates catalog deterministically and stably', () => {
        const currentCatalog: RegistryCatalogManifest = {
            catalogId: 'cat-1',
            catalogVersion: '1.0.0',
            catalogGeneratedAtExcludedFromHash: '',
            catalogSignature: null,
            catalogHash: '',
            policyPacks: [
                {
                    policyPackId: 'beta',
                    availableVersions: ['1.0.0'],
                    manifestHashPerVersion: { '1.0.0': 'hash-beta' },
                    dependencyGraphHashPerVersion: { '1.0.0': 'dep-beta' }
                }
            ]
        };

        const bundle: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test-bundle',
            bundleCreatedAtExcludedFromHash: '',
            bundleManifestHash: '',
            bundleDependencyGraphHash: 'dep-alpha-2',
            bundleCapabilitySnapshotHash: '',
            bundleDatasetCompatibilitySnapshotHash: '',
            bundleExecutionModeSnapshotHash: '',
            bundleSignature: null,
            bundlePayload: Buffer.from(JSON.stringify({
                includedPolicyPacks: [
                    { policyPackId: 'alpha', policyPackVersion: '2.0.0' }
                ]
            })).toString('base64')
        };

        const result = mutateRegistryCatalogDeterministically(currentCatalog, bundle, 'cat-1');

        if (result.mutatedCatalog) {
            const { catalogGeneratedAtExcludedFromHash, ...stableCatalog } = result.mutatedCatalog;
            expect(stableCatalog).toMatchInlineSnapshot(`
              {
                "catalogHash": "7ea176980ada23996ccb70054a48f5718c532d644b4af5141995f46bafb41fa1",
                "catalogId": "cat-1",
                "catalogSignature": null,
                "catalogVersion": "1.0.0",
                "policyPacks": [
                  {
                    "availableVersions": [
                      "2.0.0",
                    ],
                    "dependencyGraphHashPerVersion": {
                      "2.0.0": "dep-alpha-2",
                    },
                    "manifestHashPerVersion": {
                      "2.0.0": "ac0cf6f381157e188a5915ba5f7f6254dab2b8cc0ff42fa1ec1ab6ea9a203c17",
                    },
                    "policyPackId": "alpha",
                  },
                  {
                    "availableVersions": [
                      "1.0.0",
                    ],
                    "dependencyGraphHashPerVersion": {
                      "1.0.0": "dep-beta",
                    },
                    "manifestHashPerVersion": {
                      "1.0.0": "hash-beta",
                    },
                    "policyPackId": "beta",
                  },
                ],
              }
            `);
        }
    });
});
