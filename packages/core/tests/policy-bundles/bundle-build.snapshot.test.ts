import { describe, test, expect } from 'vitest';
import { buildPolicyPackBundle } from '../../src/policy-bundles/buildPolicyPackBundle.js';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';

describe('Bundle Build Engine Contract', () => {
    test('builds deterministic bundle closure and signature base', () => {
        const entryPacks: RegistryPolicyPackManifest[] = [
            {
                policyPackId: 'alpha',
                policyPackVersion: '1.0.0',
                supportedCapabilities: ['A'],
                requiredCapabilities: ['A'],
                supportedDatasetSchemas: ['schema-1'],
                supportedExecutionModes: ['multi-provider-federated']
            }
        ];

        const result = buildPolicyPackBundle(
            'test-bundle',
            '1.0.0',
            entryPacks,
            entryPacks,
            ['A'],
            ['schema-1'],
            'multi-provider-federated',
            ['prov-aws']
        );

        // Remove dynamic date and payload for snapshot stability
        if (result.bundleArtifact) {
            const { bundleCreatedAtExcludedFromHash, bundlePayload, ...stableArtifact } = result.bundleArtifact;
            expect(stableArtifact).toMatchInlineSnapshot(`
              {
                "bundleCapabilitySnapshotHash": "d2a4b37cac0a57e42b1fe002a68c2449a7e41646eec1a92a0f0acd39fae589ce",
                "bundleDatasetCompatibilitySnapshotHash": "ec305e86ac8f7abd12bc12a8dfdad6c43bdc3c90f8217cb899e7a335b64471d7",
                "bundleDependencyGraphHash": "12493e1e5276db8f173f9cd53e879b81bc397c0373e51f0157b913471cf68b4f",
                "bundleExecutionModeSnapshotHash": "fcdb63df2e46951d9c540263a645e8f3b314cde9cdfaa3ba89118c544ceaebdb",
                "bundleFormatVersion": "1",
                "bundleId": "test-bundle",
                "bundleManifestHash": "fea8179616e849b570d3447f3fefc9d781738f7bb4a8898711f50bb7e7a99e9e",
                "bundleSignature": null,
              }
            `);
        }
        
        expect(result.dependencyClosure).toMatchInlineSnapshot(`
          [
            "alpha@1.0.0",
          ]
        `);
    });
});
