import { describe, test, expect, vi } from 'vitest';
import { operatorInitCommand } from '../../cli/src/commands/operator/index.js';

describe('Operator Registration', () => {
    test('renders deterministic operator init', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await operatorInitCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "operator-initialized",
          }
        `);
        consoleSpy.mockRestore();
    });
});
