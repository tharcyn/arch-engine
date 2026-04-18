import { describe, test, expect, vi } from 'vitest';
import { assuranceDriftCommand } from '../../cli/src/commands/assurance/index.js';

describe('Submission Drift', () => {
    test('renders deterministic drift detection', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceDriftCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "drift-detected",
          }
        `);
        consoleSpy.mockRestore();
    });
});
