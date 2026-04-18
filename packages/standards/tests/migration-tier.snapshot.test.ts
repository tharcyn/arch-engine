import { describe, test, expect, vi } from 'vitest';
import { standardsMigrationTiersCommand } from '../../cli/src/commands/standards/index.js';

describe('Migration Tier', () => {
    test('renders deterministic migration tier', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await standardsMigrationTiersCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "migration-tiers-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
