import { describe, test, expect, vi } from 'vitest';
import { registryNetworkListCommand } from '../../cli/src/commands/registry-network/index.js';

describe('Registry Network', () => {
    test('renders deterministic registry network list', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await registryNetworkListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "network-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
