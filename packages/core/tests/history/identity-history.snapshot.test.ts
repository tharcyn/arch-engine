import { describe, test, expect, vi } from 'vitest';
import { metricsIdentityLifecycleCommand } from '../../../cli/src/commands/metrics/index.js';

describe('Identity History', () => {
    test('renders deterministic identity history', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsIdentityLifecycleCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "aliasAdoption": [
              "alias-a",
            ],
            "collisionIntroduction": [
              "alias-collision",
            ],
            "collisionResolution": [
              "alias-resolved",
            ],
            "providerPrecedenceShifts": [
              "provider-x->provider-y",
            ],
            "volatilityScore": 0.8,
          }
        `);
        consoleSpy.mockRestore();
    });
});
