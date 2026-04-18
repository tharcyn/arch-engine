import { describe, test, expect, vi } from 'vitest';
import { copilotOptimizePolicyCommand } from '../../cli/src/commands/copilot/index.js';

describe('Policy Optimization', () => {
    test('renders deterministic policy optimization', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await copilotOptimizePolicyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "policy-optimized",
          }
        `);
        consoleSpy.mockRestore();
    });
});
