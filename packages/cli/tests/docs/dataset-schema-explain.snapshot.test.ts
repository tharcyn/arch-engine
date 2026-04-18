import { describe, test, expect, vi } from 'vitest';
import { datasetSchemasExplainCommand } from '../../src/commands/docs/dataset.js';

describe('Dataset Schema Explain Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await datasetSchemasExplainCommand('schema-v1', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "compatibilityWithPolicyPackCapabilitySurfaces": [
              "authority-boundary",
            ],
            "federationMergeSemantics": "strict-union",
            "identityResolutionBehavior": "EXACT_DATASET_REPLAY",
            "requiredTopologyEdges": [
              "EdgeA",
            ],
            "requiredTopologyNodes": [
              "NodeA",
            ],
            "schemaId": "schema-v1",
            "schemaVersion": "1.0.0",
          }
        `);
        consoleSpy.mockRestore();
    });
});
