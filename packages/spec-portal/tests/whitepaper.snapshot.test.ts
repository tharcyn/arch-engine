import { describe, test, expect, vi } from 'vitest';
import { specExportWhitepaperCommand } from '../../cli/src/commands/spec/index.js';

describe('Whitepaper Bundle', () => {
    test('renders deterministic whitepaper export structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await specExportWhitepaperCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "whitepaper-exported",
          }
        `);
        consoleSpy.mockRestore();
    });
});
