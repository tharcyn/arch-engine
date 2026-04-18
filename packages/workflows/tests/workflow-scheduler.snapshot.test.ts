import { describe, test, expect, vi } from 'vitest';
import { workflowStartCommand } from '../../cli/src/commands/workflow/index.js';

describe('Workflow Scheduler', () => {
    test('renders deterministic workflow start', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await workflowStartCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "workflow-started",
          }
        `);
        consoleSpy.mockRestore();
    });
});
