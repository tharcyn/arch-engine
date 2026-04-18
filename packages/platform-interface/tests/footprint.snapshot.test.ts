import { describe, test, expect, vi } from 'vitest';
import { platformFootprintCommand } from '../../cli/src/commands/platform/index.js';

describe('Footprint', () => {
    test('renders deterministic footprint estimation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await platformFootprintCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "footprint-estimated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
