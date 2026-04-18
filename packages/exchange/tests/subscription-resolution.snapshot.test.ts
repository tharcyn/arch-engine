import { describe, test, expect, vi } from 'vitest';
import { exchangeSubscribeCommand } from '../../cli/src/commands/exchange/index.js';

describe('Subscription Resolution', () => {
    test('renders deterministic subscription', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await exchangeSubscribeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "subscribed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
