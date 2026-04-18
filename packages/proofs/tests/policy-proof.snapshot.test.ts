import { describe, test, expect, vi } from 'vitest';
import { provePolicyCommand } from '../../cli/src/commands/prove/index.js';

describe('Policy Proof', () => {
    test('renders deterministic policy proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await provePolicyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "policy-proven",
          }
        `);
        consoleSpy.mockRestore();
    });
});
