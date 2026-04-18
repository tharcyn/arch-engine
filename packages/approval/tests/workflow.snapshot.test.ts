import { describe, test, expect, vi } from 'vitest';
import { approvalWorkflowStartCommand } from '../../cli/src/commands/approval/index.js';

describe('Workflow', () => {
    test('renders deterministic workflow resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalWorkflowStartCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "workflow-started",
          }
        `);
        consoleSpy.mockRestore();
    });
});
