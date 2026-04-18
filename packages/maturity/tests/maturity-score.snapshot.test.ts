import { describe, test, expect, vi } from 'vitest';
import { maturityScoreCommand } from '../../cli/src/commands/maturity/index.js';

describe('Maturity Score', () => {
    test('renders deterministic maturity score', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await maturityScoreCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "maturity-scored",
          }
        `);
        consoleSpy.mockRestore();
    });
});
