import { describe, test, expect, vi } from 'vitest';
import { protocolBadgesCommand } from '../../cli/src/commands/ecosystem/index.js';

describe('Badge Generation', () => {
    test('renders deterministic badge generation classifications', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await protocolBadgesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "badges-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
