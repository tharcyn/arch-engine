import { describe, test, expect, vi } from 'vitest';
import { replayDiffCommand } from '../../src/commands/replay/diff.js';

describe('Identity Drift Detection', () => {
    test('detects identity drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayDiffCommand({ identity: true, json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftClassifications": [
              {
                "classification": "IDENTITY_COLLISION_RESOLVED_DIFFERENTLY",
                "driftDescription": "Collision resolution strategy changed",
                "nodeId": "node-2",
              },
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
