import { describe, test, expect, vi } from 'vitest';
import { pluginListCommand } from '../../cli/src/commands/plugin/index.js';

describe('Plugin Registration', () => {
    test('renders deterministic plugin registration list', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await pluginListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          [
            {
              "capabilities": [
                {
                  "type": "enforcement",
                },
              ],
              "pluginId": "kubernetes-admission",
            },
          ]
        `);
        consoleSpy.mockRestore();
    });
});
