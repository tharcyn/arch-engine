import { describe, test, expect, vi } from 'vitest';
import { workflowPlanCommand } from '../../cli/src/commands/workflow/index.js';

describe('Workflow DAG', () => {
    test('renders deterministic workflow plan', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await workflowPlanCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "workflow-planned",
          }
        `);
        consoleSpy.mockRestore();
    });
});
