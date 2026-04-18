import { describe, test, expect, vi } from 'vitest';
import { verifyExternalCommand } from '../../cli/src/commands/verify/index.js';

describe('External Verifier', () => {
    test('renders deterministic external verification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await verifyExternalCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "external-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
