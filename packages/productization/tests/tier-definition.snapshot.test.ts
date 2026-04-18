import { describe, test, expect, vi } from 'vitest';
import { productCompareTiersCommand } from '../../cli/src/commands/productization/index.js';

describe('Tier Definition', () => {
    test('renders deterministic tier resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await productCompareTiersCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "tiers-compared",
          }
        `);
        consoleSpy.mockRestore();
    });
});
