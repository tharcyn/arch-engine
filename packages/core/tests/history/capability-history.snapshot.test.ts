import { describe, test, expect, vi } from 'vitest';
import { metricsCapabilityAdoptionCommand } from '../../../cli/src/commands/metrics/index.js';

describe('Capability History', () => {
    test('renders deterministic capability history', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsCapabilityAdoptionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "adoptionRate": 75.4,
            "capabilityActivation": [
              "cap-x",
            ],
            "capabilitySuppression": [
              "cap-old",
            ],
            "intersectionDrift": [
              "intersect-1",
            ],
            "providerEligibilityDrift": [
              "provider-eligible",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
