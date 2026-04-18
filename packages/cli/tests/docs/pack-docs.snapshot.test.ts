import { describe, test, expect, vi } from 'vitest';
import { packDocsCommand } from '../../src/commands/docs/pack.js';

describe('Pack Docs Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await packDocsCommand('test-pack', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "bundleCompatibilityEligibility": true,
            "capabilityRequirements": [
              "authority-boundary",
            ],
            "conflictDeclarations": [
              "gamma",
            ],
            "datasetCompatibility": [
              "schema-v1",
            ],
            "dependencyClosureGraph": {
              "edges": [
                "alpha->beta",
              ],
              "nodes": [
                "alpha",
                "beta",
              ],
            },
            "executionModeCompatibility": [
              "single-provider",
              "multi-provider-federated",
            ],
            "manifestSummary": "A test policy pack",
            "optionalDependencySurface": [],
            "packId": "test-pack",
            "promotionStageReadiness": "development",
            "registryCompatibilityEligibility": true,
          }
        `);
        consoleSpy.mockRestore();
    });
});
