import { describe, test, expect, vi } from 'vitest';
import { protocolCompatibilityCommand } from '../../cli/src/commands/protocol/index.js';

describe('Capability Advertisement', () => {
    test('renders deterministic capability advertisement surfaces', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await protocolCompatibilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "protocol-compatibility-checked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
