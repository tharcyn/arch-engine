import { describe, test, expect, vi } from 'vitest';
import { foundationSpecLifecycleCommand } from '../../cli/src/commands/foundation/index.js';

describe('Spec Lifecycle', () => {
    test('renders deterministic spec lifecycle validation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await foundationSpecLifecycleCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "spec-lifecycle-retrieved",
          }
        `);
        consoleSpy.mockRestore();
    });
});
