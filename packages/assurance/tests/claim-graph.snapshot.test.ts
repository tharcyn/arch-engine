import { describe, test, expect, vi } from 'vitest';
import { assuranceGraphCommand } from '../../cli/src/commands/assurance/index.js';

describe('Claim Graph', () => {
    test('renders deterministic claim graph', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceGraphCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "assurance-graphed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
