import { describe, test, expect, vi } from 'vitest';
import { exchangePropagateBundlesCommand } from '../../cli/src/commands/exchange/index.js';

describe('Bundle Propagation', () => {
    test('renders deterministic bundle propagation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await exchangePropagateBundlesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "bundles-propagated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
