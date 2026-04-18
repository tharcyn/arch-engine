import { describe, test, expect, vi } from 'vitest';
import { simulateTopologyChangeCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Topology Change Simulation', () => {
    test('renders deterministic topology change prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateTopologyChangeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilityEligibilityDrift": "CAPABILITY_REMOVED",
            "datasetCompatibilityDrift": "none",
            "findingDrift": "FINDING_ADDED",
            "identityResolutionDrift": "none",
            "ruleActivationDrift": "none",
          }
        `);
        consoleSpy.mockRestore();
    });
});
