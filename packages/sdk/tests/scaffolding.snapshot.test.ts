import { describe, test, expect } from 'vitest';
import { createPolicyPackTestHarness, generateBundleConfig, prepareBundlePublishingDescriptor } from '../src/bundles/index.js';

describe('Scaffolding Template Contract', () => {
    test('test harness templates are stable', async () => {
        const { createPolicyPackTestHarness } = await import('../src/testing/index.js');
        expect(createPolicyPackTestHarness('test-pack')).toMatchInlineSnapshot(`
          "import { describe, test, expect } from 'vitest';
          import { createPolicyPackManifest } from '@arch-engine/sdk';

          describe('test-pack Test Harness', () => {
              test('validates harness loads successfully', () => {
                  expect(true).toBe(true);
              });
          });
          "
        `);
    });

    test('bundle integration templates are stable', () => {
        expect(generateBundleConfig('test-pack')).toMatchInlineSnapshot(`
          "export default {
              packId: 'test-pack',
              targetRegistry: 'default',
              signatureRequired: false,
              buildCapabilities: ['A'],
              buildDatasetSchemas: ['schema-v1']
          };
          "
        `);
        
        expect(prepareBundlePublishingDescriptor('reg-1', 'cat-1')).toMatchInlineSnapshot(`
          {
            "catalogMutationMode": "strict-parity",
            "mirrorPropagationPolicy": "do-not-propagate",
            "promotionStage": "development",
            "publishStrategy": "replace-if-hash-match",
            "signatureRequirement": "none",
            "targetCatalogId": "cat-1",
            "targetRegistryId": "reg-1",
          }
        `);
    });
});
