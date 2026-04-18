import { describe, test, expect, vi } from 'vitest';
import { controllerStatusCommand } from '../../cli/src/commands/controller/index.js';

describe('Controller Loop', () => {
    test('renders deterministic controller loop status', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await controllerStatusCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "controller-running",
          }
        `);
        consoleSpy.mockRestore();
    });
});
