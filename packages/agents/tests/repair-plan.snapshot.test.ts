import { describe, test, expect, vi } from 'vitest';
import { agentPlanCommand } from '../../cli/src/commands/agent/index.js';

describe('Repair Plan', () => {
    test('renders deterministic repair plan', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await agentPlanCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "agent-planned",
          }
        `);
        consoleSpy.mockRestore();
    });
});
