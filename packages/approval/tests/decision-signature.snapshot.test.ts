import { describe, test, expect, vi } from 'vitest';
import { approvalSignCommand } from '../../cli/src/commands/approval/index.js';

describe('Decision Signature', () => {
    test('renders deterministic decision signature structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalSignCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "decision-signed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
