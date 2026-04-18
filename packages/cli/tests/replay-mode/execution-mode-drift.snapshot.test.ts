import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Execution Mode Drift Detection', () => {
    test('detects execution mode drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ executionModes: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "classification": "EXECUTION_MODE_ELIGIBILITY_CHANGED",
                "driftDescription": "Pack is no longer eligible for offline mode",
                "modeId": "offline",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
