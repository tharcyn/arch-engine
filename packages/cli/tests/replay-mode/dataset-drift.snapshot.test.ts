import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Dataset Drift Detection', () => {
    test('detects dataset schema added drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ datasets: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "classification": "DATASET_SCHEMA_ADDED",
                "driftDescription": "A new dataset schema is required",
                "schemaId": "schema-v2",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
