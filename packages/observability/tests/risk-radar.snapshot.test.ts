import { describe, test, expect, vi } from 'vitest';
import { observeEcosystemRiskCommand } from '../../cli/src/commands/observe/index.js';

describe('Risk Radar', () => {
    test('renders deterministic ecosystem risk', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await observeEcosystemRiskCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "ecosystem-risk-observed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
