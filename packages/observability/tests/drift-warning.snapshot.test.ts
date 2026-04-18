import { describe, test, expect, vi } from 'vitest';
import { observeDriftRiskCommand } from '../../cli/src/commands/observe/index.js';

describe('Drift Warning', () => {
    test('renders deterministic drift risk', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await observeDriftRiskCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "drift-risk-observed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
