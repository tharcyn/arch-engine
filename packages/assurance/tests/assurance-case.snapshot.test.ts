import { describe, test, expect, vi } from 'vitest';
import { assuranceCreateCommand } from '../../cli/src/commands/assurance/index.js';

describe('Assurance Case', () => {
    test('renders deterministic assurance case', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceCreateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "assurance-created",
          }
        `);
        consoleSpy.mockRestore();
    });
});
