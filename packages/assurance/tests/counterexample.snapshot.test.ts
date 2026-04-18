import { describe, test, expect, vi } from 'vitest';
import { assuranceCounterexampleCommand } from '../../cli/src/commands/assurance/index.js';

describe('Counterexample', () => {
    test('renders deterministic counterexample', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceCounterexampleCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "counterexample-generated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
