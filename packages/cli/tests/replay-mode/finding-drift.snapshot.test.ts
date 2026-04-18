import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Finding Drift Detection', () => {
    test('detects finding drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ findings: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "classification": "FINDING_SEVERITY_CHANGED",
                "driftDescription": "Severity increased from medium to high",
                "findingId": "finding-1",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
