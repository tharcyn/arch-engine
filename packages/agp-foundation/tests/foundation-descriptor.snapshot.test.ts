import { describe, test, expect, vi } from 'vitest';
import { foundationInspectCommand } from '../../cli/src/commands/foundation/index.js';

describe('Foundation Descriptor', () => {
    test('renders deterministic foundation descriptor', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await foundationInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "foundation-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
