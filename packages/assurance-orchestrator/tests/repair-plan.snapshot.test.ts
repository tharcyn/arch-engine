import { describe, test, expect, vi } from 'vitest';
import { assuranceOrchestrateCommand } from '../../cli/src/commands/assurance/index.js';

describe('Assurance Repair Plan', () => {
    test('renders deterministic repair plan', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceOrchestrateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "assurance-orchestrated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
