import { describe, test, expect, vi } from 'vitest';
import { featureAccessCommand } from '../../cli/src/commands/productization/index.js';

describe('Feature Gate', () => {
    test('renders deterministic feature gate surfaces', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await featureAccessCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "feature-access-checked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
