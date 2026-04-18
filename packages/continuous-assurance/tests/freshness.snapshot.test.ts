import { describe, test, expect, vi } from 'vitest';
import { assuranceFreshnessCommand } from '../../cli/src/commands/assurance/index.js';

describe('Evidence Freshness', () => {
    test('renders deterministic freshness check', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceFreshnessCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "freshness-checked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
