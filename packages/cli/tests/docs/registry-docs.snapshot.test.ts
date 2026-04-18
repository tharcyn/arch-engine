import { describe, test, expect, vi } from 'vitest';
import { registryDocsCommand } from '../../src/commands/docs/registry.js';

describe('Registry Docs Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await registryDocsCommand('test-pack', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "availableVersions": [
              "1.0.0",
              "1.1.0",
            ],
            "capabilityCompatibilitySurfaces": [
              "authority-boundary",
            ],
            "datasetCompatibilityMatrices": [
              "schema-v1",
            ],
            "dependencyClosurePreviews": {
              "nodes": [
                "alpha",
                "beta",
              ],
            },
            "executionModeCompatibilityMatrices": [
              "multi-provider-federated",
            ],
            "mirrorAvailability": [
              "reg-1",
              "reg-2",
            ],
            "packId": "test-pack",
            "promotionLadderEligibility": [
              "development",
              "production",
            ],
            "semverResolutionSurfaces": [
              "^1.0.0",
            ],
            "trustTierClassification": "verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
