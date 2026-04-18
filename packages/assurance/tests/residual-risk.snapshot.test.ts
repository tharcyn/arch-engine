import { describe, test, expect, vi } from 'vitest';
import { assuranceResidualRiskCommand } from '../../cli/src/commands/assurance/index.js';

describe('Residual Risk', () => {
    test('renders deterministic residual risk', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceResidualRiskCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "risk-analyzed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
