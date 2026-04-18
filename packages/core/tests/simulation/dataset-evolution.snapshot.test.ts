import { describe, test, expect, vi } from 'vitest';
import { simulateDatasetCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Dataset Evolution Simulation', () => {
    test('renders deterministic dataset prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateDatasetCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "federationEligibilityChanges": [
              "none",
            ],
            "identityMergeBehaviorChanges": [
              "alias-enabled",
            ],
            "policyPackActivationChanges": [
              "pack-auth",
            ],
            "schemaCompatibilityGain": [
              "schema-v2",
            ],
            "schemaCompatibilityLoss": [
              "schema-v1",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
