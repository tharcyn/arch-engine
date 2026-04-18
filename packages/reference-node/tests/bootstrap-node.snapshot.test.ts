import { describe, test, expect, vi } from 'vitest';
import { referenceNodeBootstrapFederationCommand } from '../../cli/src/commands/reference-node/index.js';

describe('Bootstrap Node', () => {
    test('renders deterministic bootstrap node trust initialization', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await referenceNodeBootstrapFederationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "federation-bootstrapped",
          }
        `);
        consoleSpy.mockRestore();
    });
});
