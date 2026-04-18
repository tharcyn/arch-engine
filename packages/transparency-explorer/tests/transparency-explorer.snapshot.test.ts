import { describe, test, expect, vi } from 'vitest';
import { transparencyExploreBundleCommand } from '../../cli/src/commands/transparency/index.js';

describe('Transparency Explorer', () => {
    test('renders deterministic transparency explore', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await transparencyExploreBundleCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "bundle-explored",
          }
        `);
        consoleSpy.mockRestore();
    });
});
