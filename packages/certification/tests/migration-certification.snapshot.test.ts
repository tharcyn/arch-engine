import { describe, test, expect, vi } from 'vitest';
import { certifyMigrationCommand } from '../../cli/src/commands/certify/index.js';

describe('Migration Certification', () => {
    test('renders deterministic migration certification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await certifyMigrationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "migration-certified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
