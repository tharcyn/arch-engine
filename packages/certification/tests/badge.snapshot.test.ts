import { describe, test, expect, vi } from 'vitest';
import { certifyBadgesCommand } from '../../cli/src/commands/certify/index.js';

describe('Badge Generation', () => {
    test('renders deterministic badge generation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await certifyBadgesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "badges-generated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
