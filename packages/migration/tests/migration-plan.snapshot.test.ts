import { describe, test, expect, vi } from 'vitest';
import { migrationPlanCommand } from '../../cli/src/commands/migration/index.js';

describe('Migration Plan', () => {
    test('renders deterministic migration plan', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await migrationPlanCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "migration-planned",
          }
        `);
        consoleSpy.mockRestore();
    });
});
