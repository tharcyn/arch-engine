import { describe, test, expect, vi } from 'vitest';
import { standardsMaturityTiersCommand } from '../../cli/src/commands/standards/index.js';

describe('Maturity Tier', () => {
    test('renders deterministic maturity tier', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await standardsMaturityTiersCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "maturity-tiers-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
