import { describe, test, expect, vi } from 'vitest';
import { treatyNegotiateCommand } from '../../cli/src/commands/treaty/index.js';

describe('Treaty Negotiation', () => {
    test('renders deterministic treaty negotiation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await treatyNegotiateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "treaty-negotiated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
