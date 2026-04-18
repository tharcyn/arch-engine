import { describe, test, expect, vi } from 'vitest';
import { exchangePeerListCommand } from '../../cli/src/commands/exchange/index.js';

describe('Peer Resolution', () => {
    test('renders deterministic exchange peer list', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await exchangePeerListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          [
            {
              "peerId": "peer-1",
            },
          ]
        `);
        consoleSpy.mockRestore();
    });
});
