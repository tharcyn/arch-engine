import { describe, test, expect, vi } from 'vitest';
import { foundationRegistryBootstrapCommand } from '../../cli/src/commands/foundation/index.js';

describe('Registry Authority', () => {
    test('renders deterministic registry authority bootstrap', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await foundationRegistryBootstrapCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "registry-bootstrapped",
          }
        `);
        consoleSpy.mockRestore();
    });
});
