import { describe, test, expect, vi } from 'vitest';
import { appRunCommand } from '../../cli/src/commands/app/index.js';

describe('Policy App Runtime', () => {
    test('renders deterministic app run', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await appRunCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "app-running",
          }
        `);
        consoleSpy.mockRestore();
    });
});
