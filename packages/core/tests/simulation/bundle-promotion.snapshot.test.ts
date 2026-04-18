import { describe, test, expect, vi } from 'vitest';
import { simulateBundleCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Bundle Promotion Simulation', () => {
    test('renders deterministic bundle prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateBundleCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilitySnapshotDrift": "unchanged",
            "datasetSnapshotDrift": "unchanged",
            "dependencyClosureDrift": "unchanged",
            "promotionEligibilityDrift": "eligible",
            "registryCompatibilityDrift": "compatible",
          }
        `);
        consoleSpy.mockRestore();
    });
});
