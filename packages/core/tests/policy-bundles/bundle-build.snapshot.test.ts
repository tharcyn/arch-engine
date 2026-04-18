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
                "bundleManifestHash": "2227b0a0e839108097d84a9e4824d84b8d8014ae7c026ca6e08a4081991e0cf5",
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
