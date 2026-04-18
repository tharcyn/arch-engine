import { describe, test, expect, vi } from 'vitest';
import { aglParseCommand } from '../../cli/src/commands/agl/index.js';

describe('AGL Parser', () => {
    test('renders deterministic AGL parsing', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await aglParseCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "agl-parsed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
