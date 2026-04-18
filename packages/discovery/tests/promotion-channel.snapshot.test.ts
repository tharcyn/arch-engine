import { describe, test, expect, vi } from 'vitest';
import { discoverBundlesCommand } from '../../cli/src/commands/discover/index.js';

describe('Promotion Channel', () => {
    test('renders deterministic bundle discovery', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await discoverBundlesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "bundles-discovered",
          }
        `);
        consoleSpy.mockRestore();
    });
});
