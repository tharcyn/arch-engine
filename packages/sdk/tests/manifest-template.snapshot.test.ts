import { describe, test, expect } from 'vitest';
import { createPolicyPackManifest } from '../src/policy-pack/index.js';

describe('Manifest Template Generation Contract', () => {
    test('enforces deterministic properties ordering', () => {
        const manifest = createPolicyPackManifest({
            policyPackId: 'alpha-pack',
            policyPackVersion: '1.2.3',
            supportedCapabilities: ['Z', 'B', 'A'],
            supportedDatasetSchemas: ['schema-v2', 'schema-v1'],
            supportedExecutionModes: ['multi-provider', 'single-provider']
        });

        expect(manifest).toMatchInlineSnapshot(`
          {
            "policyPackId": "alpha-pack",
            "policyPackVersion": "1.2.3",
            "requiredCapabilities": [],
            "supportedCapabilities": [
              "A",
              "B",
              "Z",
            ],
            "supportedDatasetSchemas": [
              "schema-v1",
              "schema-v2",
            ],
            "supportedExecutionModes": [
              "single-provider",
            ],
          }
        `);
    });
});
