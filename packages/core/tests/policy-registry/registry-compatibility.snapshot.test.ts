import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { resolvePolicyPackCompatibility } from '../../src/policy-registry/resolvePolicyPackCompatibility.js';

describe('Policy Pack Registry Compatibility Contract', () => {
    test('capability and schema filtering logic remains stable', () => {
        const packs: RegistryPolicyPackManifest[] = [
            {
                policyPackId: 'pack-A',
                policyPackVersion: '1.0.0',
                supportedCapabilities: ['x'],
                requiredCapabilities: ['x'],
                supportedDatasetSchemas: ['schema-1'],
                supportedExecutionModes: ['multi-provider-federated']
            },
            {
                policyPackId: 'pack-B',
                policyPackVersion: '1.0.0',
                supportedCapabilities: ['y'],
                requiredCapabilities: ['x', 'y'], // missing y in context
                supportedDatasetSchemas: ['schema-1'],
                supportedExecutionModes: ['multi-provider-federated']
            },
            {
                policyPackId: 'pack-C',
                policyPackVersion: '1.0.0',
                supportedCapabilities: ['x'],
                requiredCapabilities: ['x'],
                supportedDatasetSchemas: ['schema-2'], // incompatible schema
                supportedExecutionModes: ['multi-provider-federated']
            },
            {
                policyPackId: 'pack-D',
                policyPackVersion: '1.0.0',
                supportedCapabilities: ['x'],
                requiredCapabilities: ['x'],
                supportedDatasetSchemas: ['schema-1'],
                supportedExecutionModes: ['single-provider'] // incompatible mode
            }
        ];

        const compatibility = resolvePolicyPackCompatibility(packs, ['x'], ['schema-1'], 'multi-provider-federated');
        
        expect(compatibility).toMatchInlineSnapshot(`
          {
            "blocked": [
              {
                "policyPackId": "pack-B",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [
                  "x",
                  "y",
                ],
                "supportedCapabilities": [
                  "y",
                ],
                "supportedDatasetSchemas": [
                  "schema-1",
                ],
                "supportedExecutionModes": [
                  "multi-provider-federated",
                ],
              },
              {
                "policyPackId": "pack-C",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [
                  "x",
                ],
                "supportedCapabilities": [
                  "x",
                ],
                "supportedDatasetSchemas": [
                  "schema-2",
                ],
                "supportedExecutionModes": [
                  "multi-provider-federated",
                ],
              },
              {
                "policyPackId": "pack-D",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [
                  "x",
                ],
                "supportedCapabilities": [
                  "x",
                ],
                "supportedDatasetSchemas": [
                  "schema-1",
                ],
                "supportedExecutionModes": [
                  "single-provider",
                ],
              },
            ],
            "blockingCapabilities": [
              "y",
            ],
            "blockingDatasets": [
              "schema-2",
            ],
            "blockingExecutionModes": [
              "multi-provider-federated",
            ],
            "eligible": [
              {
                "policyPackId": "pack-A",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [
                  "x",
                ],
                "supportedCapabilities": [
                  "x",
                ],
                "supportedDatasetSchemas": [
                  "schema-1",
                ],
                "supportedExecutionModes": [
                  "multi-provider-federated",
                ],
              },
            ],
          }
        `);
    });
});
