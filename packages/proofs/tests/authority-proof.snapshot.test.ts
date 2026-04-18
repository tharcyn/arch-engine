import { describe, test, expect, vi } from 'vitest';
import { proveAuthorityCommand } from '../../cli/src/commands/prove/index.js';

describe('Authority Proof', () => {
    test('renders deterministic authority proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await proveAuthorityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "authority-proven",
          }
        `);
        consoleSpy.mockRestore();
    });
});
