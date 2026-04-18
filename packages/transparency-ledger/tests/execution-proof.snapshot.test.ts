import { describe, test, expect, vi } from 'vitest';
import { ledgerProveExecutionCommand } from '../../cli/src/commands/ledger/index.js';

describe('Execution Proof', () => {
    test('renders deterministic execution proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await ledgerProveExecutionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "execution-proved",
          }
        `);
        consoleSpy.mockRestore();
    });
});
