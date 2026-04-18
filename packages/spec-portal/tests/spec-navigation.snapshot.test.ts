import { describe, test, expect, vi } from 'vitest';
import { specNavigationMapCommand } from '../../cli/src/commands/spec/index.js';

describe('Spec Navigation', () => {
    test('renders deterministic spec navigation graph', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await specNavigationMapCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "navigation-mapped",
          }
        `);
        consoleSpy.mockRestore();
    });
});
