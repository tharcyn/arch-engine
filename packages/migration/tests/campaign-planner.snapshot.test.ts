import { describe, test, expect, vi } from 'vitest';
import { migrationCampaignStartCommand } from '../../cli/src/commands/migration/index.js';

describe('Campaign Planner', () => {
    test('renders deterministic campaign start', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await migrationCampaignStartCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "campaign-started",
          }
        `);
        consoleSpy.mockRestore();
    });
});
