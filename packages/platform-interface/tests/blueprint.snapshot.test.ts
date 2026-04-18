import { describe, test, expect, vi } from 'vitest';
import { blueprintListCommand } from '../../cli/src/commands/blueprint/index.js';

describe('Blueprint', () => {
    test('renders deterministic blueprint compatibility', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await blueprintListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "blueprints-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
