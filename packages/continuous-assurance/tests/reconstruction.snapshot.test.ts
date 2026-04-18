import { describe, test, expect, vi } from 'vitest';
import { assuranceReconstructCommand } from '../../cli/src/commands/assurance/index.js';

describe('Decision Reconstruction', () => {
    test('renders deterministic decision reconstruction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceReconstructCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "decision-reconstructed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
