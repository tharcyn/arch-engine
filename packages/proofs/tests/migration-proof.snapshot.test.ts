import { describe, test, expect, vi } from 'vitest';
import { proveMigrationCommand } from '../../cli/src/commands/prove/index.js';

describe('Migration Proof', () => {
    test('renders deterministic migration proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await proveMigrationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "migration-proven",
          }
        `);
        consoleSpy.mockRestore();
    });
});
