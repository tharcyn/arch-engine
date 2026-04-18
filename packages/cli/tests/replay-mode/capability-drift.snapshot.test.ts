import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Capability Drift Detection', () => {
    test('detects capability added drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ capabilities: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "capabilityId": "new-cap",
                "classification": "CAPABILITY_ADDED",
                "driftDescription": "A new capability was added to the intersection",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
