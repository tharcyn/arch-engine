import { describe, test, expect, vi } from 'vitest';
import { protocolInspectCommand } from '../../cli/src/commands/protocol/index.js';

describe('Protocol Surface', () => {
    test('renders deterministic protocol compatibility', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await protocolInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "protocol-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
