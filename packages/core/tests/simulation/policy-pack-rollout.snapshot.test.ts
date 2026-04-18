import { describe, test, expect, vi } from 'vitest';
import { simulatePackCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Policy Pack Rollout Simulation', () => {
    test('renders deterministic pack prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulatePackCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "bundleCompatibilityShifts": [
              "none",
            ],
            "capabilityIntersectionChanges": [
              "cap-x-required",
            ],
            "dependencyClosureChanges": [
              "none",
            ],
            "executionModeEligibilityChanges": [
              "none",
            ],
            "findingSurfaceChanges": [
              "FINDING_ADDED",
            ],
            "promotionLadderEligibilityChanges": [
              "delayed",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
