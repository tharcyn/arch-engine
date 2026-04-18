import { describe, test, expect, vi } from 'vitest';
import { proveIntentCommand } from '../../cli/src/commands/prove/index.js';

describe('Intent Proof', () => {
    test('renders deterministic intent proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await proveIntentCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "intent-proven",
          }
        `);
        consoleSpy.mockRestore();
    });
});
