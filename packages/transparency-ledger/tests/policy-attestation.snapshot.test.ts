import { describe, test, expect, vi } from 'vitest';
import { attestDecisionCommand } from '../../cli/src/commands/ledger/index.js';

describe('Policy Attestation', () => {
    test('renders deterministic policy attestation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await attestDecisionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "decision-attested",
          }
        `);
        consoleSpy.mockRestore();
    });
});
