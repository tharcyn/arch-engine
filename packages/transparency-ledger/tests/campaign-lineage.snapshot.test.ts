import { describe, test, expect, vi } from 'vitest';
import { ledgerCampaignLineageCommand } from '../../cli/src/commands/ledger/index.js';

describe('Campaign Lineage', () => {
    test('renders deterministic campaign lineage', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await ledgerCampaignLineageCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "campaign-lineage-tracked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
