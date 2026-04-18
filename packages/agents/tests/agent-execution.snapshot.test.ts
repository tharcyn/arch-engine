import { describe, test, expect, vi } from 'vitest';
import { agentStartCommand } from '../../cli/src/commands/agent/index.js';

describe('Agent Execution', () => {
    test('renders deterministic agent execution status', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await agentStartCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "agent-started",
          }
        `);
        consoleSpy.mockRestore();
    });
});
