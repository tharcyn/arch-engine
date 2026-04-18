import { describe, test, expect, vi } from 'vitest';
import { trustResolveChainCommand } from '../../cli/src/commands/trust/index.js';

describe('Trust Chain', () => {
    test('renders deterministic trust chain resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await trustResolveChainCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "chain-resolved",
          }
        `);
        consoleSpy.mockRestore();
    });
});
