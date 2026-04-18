import { describe, test, expect, vi } from 'vitest';
import { referenceNodeInspectCommand } from '../../cli/src/commands/reference-node/index.js';

describe('Reference Node Descriptor', () => {
    test('renders deterministic reference node capability surface', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await referenceNodeInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "reference-node-inspected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
