import { describe, test, expect, vi } from 'vitest';
import { approvalQuorumEvaluateCommand } from '../../cli/src/commands/approval/index.js';

describe('Quorum', () => {
    test('renders deterministic quorum evaluation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalQuorumEvaluateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "quorum-evaluated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
