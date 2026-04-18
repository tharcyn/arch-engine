import { describe, test, expect, vi } from 'vitest';
import { trustDelegateCommand } from '../../cli/src/commands/trust/index.js';

describe('Delegation', () => {
    test('renders deterministic delegation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await trustDelegateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "trust-delegated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
