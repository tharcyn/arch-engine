import { describe, test, expect, vi } from 'vitest';
import { simulateCapabilityCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Capability Rollout Simulation', () => {
    test('renders deterministic capability prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateCapabilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "bundleCompatibilityShifts": [
              "bundle-x",
            ],
            "datasetRequirementsIntroduced": [
              "schema-v2",
            ],
            "executionModeEligibilityChanges": [
              "offline-added",
            ],
            "newRulesActivated": [
              "rule-a",
            ],
            "rulesSuppressed": [],
          }
        `);
        consoleSpy.mockRestore();
    });
});
