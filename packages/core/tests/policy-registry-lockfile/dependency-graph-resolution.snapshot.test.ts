import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { resolvePolicyPackDependencyGraph } from '../../src/policy-registry/resolvePolicyPackDependencyGraph.js';

describe('Dependency Graph Resolution Contract', () => {
    test('graph resolution computes deterministic closure and detects issues', () => {
        const availablePacks: RegistryPolicyPackManifest[] = [
            {
                policyPackId: 'root-pack',
                policyPackVersion: '1.0.0',
                supportedCapabilities: [],
                requiredCapabilities: [],
                supportedDatasetSchemas: [],
                supportedExecutionModes: [],
                dependencies: [{ policyPackId: 'child-pack', semverRange: '^1.0.0' }],
                optionalDependencies: [{ policyPackId: 'optional-pack', semverRange: '^2.0.0' }],
                conflicts: ['enemy-pack']
            },
            {
                policyPackId: 'child-pack',
                policyPackVersion: '1.5.0',
                supportedCapabilities: [],
                requiredCapabilities: [],
                supportedDatasetSchemas: [],
                supportedExecutionModes: [],
                dependencies: [{ policyPackId: 'grandchild-pack', semverRange: '~1.2.0' }]
            },
            {
                policyPackId: 'grandchild-pack',
                policyPackVersion: '1.2.3',
                supportedCapabilities: [],
                requiredCapabilities: [],
                supportedDatasetSchemas: [],
                supportedExecutionModes: []
            },
            {
                policyPackId: 'enemy-pack',
                policyPackVersion: '1.0.0',
                supportedCapabilities: [],
                requiredCapabilities: [],
                supportedDatasetSchemas: [],
                supportedExecutionModes: []
            }
        ];

        const entryPacks = [availablePacks[0], availablePacks[3]]; // Include root and enemy to trigger conflict

        const result = resolvePolicyPackDependencyGraph(availablePacks, entryPacks);

        expect(result).toMatchInlineSnapshot(`
          {
            "circularDependencies": [],
            "conflicts": [],
            "dependencyClosure": [
              "child-pack@1.5.0",
              "enemy-pack@1.0.0",
              "grandchild-pack@1.2.3",
              "root-pack@1.0.0",
            ],
            "missingDependencies": [],
            "resolutionDiagnostics": [
              "Optional dependency missing or incompatible: optional-pack@^2.0.0",
            ],
            "resolvedGraph": [
              {
                "dependencies": [
                  {
                    "policyPackId": "grandchild-pack",
                    "semverRange": "~1.2.0",
                  },
                ],
                "policyPackId": "child-pack",
                "policyPackVersion": "1.5.0",
                "requiredCapabilities": [],
                "supportedCapabilities": [],
                "supportedDatasetSchemas": [],
                "supportedExecutionModes": [],
              },
              {
                "policyPackId": "enemy-pack",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [],
                "supportedCapabilities": [],
                "supportedDatasetSchemas": [],
                "supportedExecutionModes": [],
              },
              {
                "policyPackId": "grandchild-pack",
                "policyPackVersion": "1.2.3",
                "requiredCapabilities": [],
                "supportedCapabilities": [],
                "supportedDatasetSchemas": [],
                "supportedExecutionModes": [],
              },
              {
                "conflicts": [
                  "enemy-pack",
                ],
                "dependencies": [
                  {
                    "policyPackId": "child-pack",
                    "semverRange": "^1.0.0",
                  },
                ],
                "optionalDependencies": [
                  {
                    "policyPackId": "optional-pack",
                    "semverRange": "^2.0.0",
                  },
                ],
                "policyPackId": "root-pack",
                "policyPackVersion": "1.0.0",
                "requiredCapabilities": [],
                "supportedCapabilities": [],
                "supportedDatasetSchemas": [],
                "supportedExecutionModes": [],
              },
            ],
          }
        `);
    });
});
