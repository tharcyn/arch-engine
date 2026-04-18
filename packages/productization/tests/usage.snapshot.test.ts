import { describe, test, expect, vi } from 'vitest';
import { usageInspectCommand } from '../../cli/src/commands/productization/index.js';

describe('Usage Metering', () => {
    test('renders deterministic metering classification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await usageInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "usage-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
