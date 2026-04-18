import { describe, test, expect, vi } from 'vitest';
import { licenseInspectCommand } from '../../cli/src/commands/productization/index.js';

describe('License', () => {
    test('renders deterministic license inspection', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await licenseInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "license-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
