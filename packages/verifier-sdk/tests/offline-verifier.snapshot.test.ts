import { describe, test, expect, vi } from 'vitest';
import { verifyOfflineCommand } from '../../cli/src/commands/verify/index.js';

describe('Offline Verifier', () => {
    test('renders deterministic offline verification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await verifyOfflineCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "offline-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
