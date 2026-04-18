import { describe, test, expect, vi } from 'vitest';
import { platformInspectCommand } from '../../cli/src/commands/platform/index.js';

describe('Platform Descriptor', () => {
    test('renders deterministic platform descriptor', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await platformInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "platform-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
