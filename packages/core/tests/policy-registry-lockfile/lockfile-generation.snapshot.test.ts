import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { resolvePolicyPackDependencyGraph } from '../../src/policy-registry/resolvePolicyPackDependencyGraph.js';
import { generatePolicyPackLockfile } from '../../src/policy-registry/generatePolicyPackLockfile.js';

describe('Lockfile Generation Contract', () => {
    test('lockfile generates deterministic hashes and structure', () => {
        const entryPacks: RegistryPolicyPackManifest[] = [
            {
                policyPackId: 'alpha-pack',
                policyPackVersion: '2.0.0',
                supportedCapabilities: ['A', 'B'],
                requiredCapabilities: ['A'],
                supportedDatasetSchemas: ['schema-alpha'],
                supportedExecutionModes: ['single-provider'],
                dependencies: []
            }
        ];

        const graphResult = resolvePolicyPackDependencyGraph(entryPacks, entryPacks);

        const lockfile = generatePolicyPackLockfile(
            graphResult,
            ['A', 'B', 'C'], // federatedCapabilitiesIntersection
            ['schema-alpha', 'schema-beta'], // datasetSchemas
            'single-provider', // executionMode
            'mock-execution-hash-123'
        );

        // Omit generatedAtExcludedFromHash for stable snapshotting
        const { generatedAtExcludedFromHash, ...stableLockfile } = lockfile;

        expect(stableLockfile).toMatchInlineSnapshot(`
          {
            "capabilityIntersectionHash": "0a2b4ad995acc6f5a040c90e6daa08ca78405335b76027f3fd2889b714991a1a",
            "datasetCompatibilityHash": "a9bcc2d94fa92961f1e1a96e3a76d2e4b0c1a20c06401d7bad908421ce0f6ebf",
            "executionModeHash": "b18dac0a4fd79c3316f3f9a10158fea41858cd2fe239a6da1c9ca9cad9015741",
            "federationExecutionHash": "mock-execution-hash-123",
            "lockfileVersion": "1",
            "policyPacks": [
              {
                "capabilityCompatibilityHash": "fefacf29692c0cd0b6897ae3d82c2bd24e66107b2329a39c045648008491883b",
                "datasetCompatibilityHash": "5ea5254a4d813321f613241e0b1d966d8186a9a1dc411e2cf5649585b3370479",
                "dependencyHash": "8565bb241bcfd0aa35ea0c0618990ff10fc0f3aa2102e04d721cf89a743dce71",
                "executionModeCompatibilityHash": "05dbe807fcbdee4102bab3143056c683c4c8b349fc3a6915a53d984231601f9c",
                "manifestHash": "09b6045c543f39538020621ca3e4bfe3bbf23b7cd4b09679908a9b069a4af9d2",
                "policyPackId": "alpha-pack",
                "resolvedVersion": "2.0.0",
              },
            ],
          }
        `);
    });
});
