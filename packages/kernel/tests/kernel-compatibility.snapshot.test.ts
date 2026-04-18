import { describe, test, expect, vi } from 'vitest';
import { kernelCompatibilityCommand } from '../../cli/src/commands/kernel/index.js';

describe('Kernel Compatibility', () => {
    test('renders deterministic compatibility surfaces', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await kernelCompatibilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "compatibility-resolved",
          }
        `);
        consoleSpy.mockRestore();
    });
});
