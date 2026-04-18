import { describe, test, expect, vi } from 'vitest';
import { approvalExpiryCommand } from '../../cli/src/commands/approval/index.js';

describe('Expiry', () => {
    test('renders deterministic expiry classification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalExpiryCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "expiry-checked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
