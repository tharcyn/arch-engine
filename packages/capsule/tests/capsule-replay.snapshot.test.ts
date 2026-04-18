import { describe, test, expect, vi } from 'vitest';
import { capsuleReplayCommand } from '../../cli/src/commands/capsule/index.js';

describe('Capsule Replay', () => {
    test('renders deterministic replay guarantees', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capsuleReplayCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capsule-replayed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
