import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { resolveFederatedPolicyPackPlan } from '../../src/policy-registry/resolveFederatedPolicyPackPlan.js';
import { resolvePolicyPackVersions } from '../../src/policy-registry/resolvePolicyPackVersions.js';

describe('Policy Pack Registry Resolution Contract', () => {
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
            policyPackId: 'pack-A',
            policyPackVersion: '2.0.0',
            supportedCapabilities: ['x', 'y'],
            requiredCapabilities: ['x'],
            supportedDatasetSchemas: ['schema-1'],
            supportedExecutionModes: ['multi-provider-federated']
        },
        {
            policyPackId: 'pack-B',
            policyPackVersion: '1.5.0',
            supportedCapabilities: ['y'],
            requiredCapabilities: ['z'],
            supportedDatasetSchemas: ['schema-1'],
            supportedExecutionModes: ['multi-provider-federated']
        }
    ];

    test('federation execution plan logic is snapshot stable', () => {
        const plan = resolveFederatedPolicyPackPlan(packs, ['x', 'y'], ['schema-1']);
        
        expect(plan).toMatchInlineSnapshot(`
          {
            "blockedPolicyPacks": [
              {
                "policyPackId": "pack-B",
                "policyPackVersion": "1.5.0",
                "requiredCapabilities": [
                  "z",
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
            ],
            "capabilityIntersectionUsed": [
              "x",
              "y",
            ],
            "eligiblePolicyPacks": [
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
              {
                "policyPackId": "pack-A",
                "policyPackVersion": "2.0.0",
                "requiredCapabilities": [
                  "x",
                ],
                "supportedCapabilities": [
                  "x",
                  "y",
                ],
                "supportedDatasetSchemas": [
                  "schema-1",
                ],
                "supportedExecutionModes": [
                  "multi-provider-federated",
                ],
              },
            ],
            "federatedCapabilityIntersectionHash": "01f650e85c95620160b40ed22626dca932e9f700ffe599be060da184dd4d7822",
            "federatedDatasetCompatibilityHash": "ec305e86ac8f7abd12bc12a8dfdad6c43bdc3c90f8217cb899e7a335b64471d7",
            "providerExecutionSetHash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
            "selectionDiagnostics": [
              "Blocked 1 policy packs due to compatibility constraints.",
              "Missing federated capabilities: z",
            ],
          }
        `);
    });

    test('version negotiation semantics are deterministic', () => {
        const versions = resolvePolicyPackVersions(packs, {
            'pack-A': '^1.0.0',
            'pack-B': '^2.0.0',
            'pack-C': '1.0.0'
        });
        
        expect(versions).toMatchInlineSnapshot(`
          [
            {
              "diagnostics": "Resolved to version 1.0.0",
              "requestedId": "pack-A",
              "requestedRange": "^1.0.0",
              "resolvedPack": {
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
            },
            {
              "diagnostics": "No version satisfies range ^2.0.0. Available: 1.5.0",
              "requestedId": "pack-B",
              "requestedRange": "^2.0.0",
              "resolvedPack": null,
            },
            {
              "diagnostics": "No policy pack found with ID: pack-C",
              "requestedId": "pack-C",
              "requestedRange": "1.0.0",
              "resolvedPack": null,
            },
          ]
        `);
    });
});
