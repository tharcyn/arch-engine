import { describe, test, expect, vi } from 'vitest';
import { discoverPacksCommand } from '../../cli/src/commands/discover/index.js';

describe('Policy Pack Index', () => {
    test('renders deterministic policy pack discovery', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await discoverPacksCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "packs-discovered",
          }
        `);
        consoleSpy.mockRestore();
    });
});
