import { describe, test, expect, vi } from 'vitest';
import { entitlementVerifyCommand } from '../../cli/src/commands/productization/index.js';

describe('Entitlement', () => {
    test('renders deterministic entitlement resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await entitlementVerifyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "entitlement-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
