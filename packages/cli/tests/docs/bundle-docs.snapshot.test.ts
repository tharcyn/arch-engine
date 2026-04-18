import { describe, test, expect, vi } from 'vitest';
import { bundleDocsCommand } from '../../src/commands/docs/bundle.js';

describe('Bundle Docs Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await bundleDocsCommand('my-bundle.archpack', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "bundlePath": "my-bundle.archpack",
            "capabilitySnapshotHash": "hash-cap",
            "datasetCompatibilitySnapshotHash": "hash-ds",
            "dependencyClosureGraph": {
              "nodes": [
                "alpha",
                "beta",
              ],
            },
            "executionModeSnapshotHash": "hash-em",
            "includedPolicyPacks": [
              "alpha",
              "beta",
            ],
            "lockfileCompatibilityStatus": "compatible",
            "promotionEligibility": "development",
            "registryCompatibilityEligibility": true,
            "signerIdentity": "test-signer",
            "sourceCatalogLineage": "cat-1",
          }
        `);
        consoleSpy.mockRestore();
    });
});
