import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Merge Drift Detection', () => {
    test('detects merge drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ merge: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "classification": "PROVIDER_MERGE_PARTICIPATION_CHANGED",
                "driftDescription": "Provider participation dropped",
                "providerId": "github",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
