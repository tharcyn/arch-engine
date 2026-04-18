import { describe, test, expect, vi } from 'vitest';
import { capsuleExportCommand } from '../../cli/src/commands/capsule/index.js';

describe('Capsule Export', () => {
    test('renders deterministic capsule structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capsuleExportCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capsule-exported",
          }
        `);
        consoleSpy.mockRestore();
    });
});
