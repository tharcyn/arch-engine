import { describe, test, expect, vi } from 'vitest';
import { approvalWaiveCommand } from '../../cli/src/commands/approval/index.js';

describe('Waiver', () => {
    test('renders deterministic waiver lifecycle structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalWaiveCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "waived",
          }
        `);
        consoleSpy.mockRestore();
    });
});
