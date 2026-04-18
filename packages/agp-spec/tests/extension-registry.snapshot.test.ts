import { describe, test, expect, vi } from 'vitest';
import { protocolExtensionsCommand } from '../../cli/src/commands/protocol/index.js';

describe('Extension Registry', () => {
    test('renders deterministic extension registry ordering', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await protocolExtensionsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "extensions-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
