import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { PolicyPackRegistry } from '../../src/policy-registry/PolicyPackRegistry.js';

describe('Policy Pack Registry Manifest Contract', () => {
    test('manifest structure remains strictly stable and predictable', () => {
        const manifest: RegistryPolicyPackManifest = {
            policyPackId: 'test-pack',
            policyPackVersion: '1.2.3',
            supportedCapabilities: ['cap-A'],
            requiredCapabilities: ['cap-A'],
            supportedDatasetSchemas: ['schema-v2'],
            supportedExecutionModes: ['multi-provider-federated']
        };

        const registry = new PolicyPackRegistry();
        registry.registerPolicyPack(manifest);

        const stored = registry.listRegisteredPolicyPacks()[0];

        expect(stored).toMatchInlineSnapshot(`
          {
            "policyPackId": "test-pack",
            "policyPackVersion": "1.2.3",
            "requiredCapabilities": [
              "cap-A",
            ],
            "supportedCapabilities": [
              "cap-A",
            ],
            "supportedDatasetSchemas": [
              "schema-v2",
            ],
            "supportedExecutionModes": [
              "multi-provider-federated",
            ],
          }
        `);
    });
});
