import { describe, test, expect, vi } from 'vitest';
import { foundationExtensionProposeCommand } from '../../cli/src/commands/foundation/index.js';

describe('Extension Lifecycle', () => {
    test('renders deterministic extension proposal validation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await foundationExtensionProposeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "extension-proposed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
