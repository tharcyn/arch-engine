import { describe, test, expect, vi } from 'vitest';
import { simulateIdentityCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Identity Resolution Simulation', () => {
    test('renders deterministic identity prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateIdentityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "identityResolutionOutcome": "alias-resolved",
          }
        `);
        consoleSpy.mockRestore();
    });
});
