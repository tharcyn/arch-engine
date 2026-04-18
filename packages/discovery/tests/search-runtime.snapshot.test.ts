import { describe, test, expect, vi } from 'vitest';
import { searchGovernanceCommand } from '../../cli/src/commands/search/index.js';

describe('Search Runtime', () => {
    test('renders deterministic governance search', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await searchGovernanceCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "governance-searched",
          }
        `);
        consoleSpy.mockRestore();
    });
});
