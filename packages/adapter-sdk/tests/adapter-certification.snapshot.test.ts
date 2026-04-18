import { describe, test, expect, vi } from 'vitest';
import { adapterCertifyCommand } from '../../cli/src/commands/adapter/index.js';

describe('Adapter Certification', () => {
    test('renders deterministic certification envelopes', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await adapterCertifyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "adapter-certified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
