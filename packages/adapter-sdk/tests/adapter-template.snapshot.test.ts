import { describe, test, expect, vi } from 'vitest';
import { adapterTemplatesCommand } from '../../cli/src/commands/adapter/index.js';

describe('Adapter Template', () => {
    test('renders deterministic adapter descriptor structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await adapterTemplatesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "templates-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
