import { describe, test, expect, vi } from 'vitest';
import { verifyPortableCommand } from '../../cli/src/commands/verify/index.js';

describe('Portable Verifier', () => {
    test('renders deterministic portable verification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await verifyPortableCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "portable-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
