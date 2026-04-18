import { describe, test, expect, vi } from 'vitest';
import { trustRevokeCommand } from '../../cli/src/commands/trust/index.js';

describe('Revocation', () => {
    test('renders deterministic revocation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await trustRevokeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "trust-revoked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
