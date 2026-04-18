import { describe, test, expect, vi } from 'vitest';
import { maturityGapsCommand } from '../../cli/src/commands/maturity/index.js';

describe('Gap Analysis', () => {
    test('renders deterministic gap analysis', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await maturityGapsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "gaps-analyzed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
