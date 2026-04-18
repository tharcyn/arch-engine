import { describe, test, expect, vi } from 'vitest';
import { referenceNodeObserverModeCommand } from '../../cli/src/commands/reference-node/index.js';

describe('Observer Node', () => {
    test('renders deterministic observer node verification surface', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await referenceNodeObserverModeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "observer-mode-initialized",
          }
        `);
        consoleSpy.mockRestore();
    });
});
