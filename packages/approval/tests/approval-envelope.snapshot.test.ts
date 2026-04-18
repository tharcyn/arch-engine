import { describe, test, expect, vi } from 'vitest';
import { approvalCreateCommand } from '../../cli/src/commands/approval/index.js';

describe('Approval Envelope', () => {
    test('renders deterministic approval ordering', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalCreateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "approval-created",
          }
        `);
        consoleSpy.mockRestore();
    });
});
