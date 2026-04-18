import { describe, test, expect, vi } from 'vitest';
import { referenceNodeCertifyAdapterCommand } from '../../cli/src/commands/reference-node/index.js';

describe('Certifier Node', () => {
    test('renders deterministic certification node contract', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await referenceNodeCertifyAdapterCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "adapter-certified-by-node",
          }
        `);
        consoleSpy.mockRestore();
    });
});
