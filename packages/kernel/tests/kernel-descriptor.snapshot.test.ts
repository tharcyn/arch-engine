import { describe, test, expect, vi } from 'vitest';
import { kernelInspectCommand } from '../../cli/src/commands/kernel/index.js';

describe('Kernel Descriptor', () => {
    test('renders deterministic execution invariants', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await kernelInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "kernel-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
