import { describe, test, expect, vi } from 'vitest';
import { packRegressionTestCommand } from '../../src/commands/pack/regression.js';

describe('Regression Runner', () => {
    test('detects policy-pack regression', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const exitCode = await packRegressionTestCommand('test-pack', { json: true, baseline: 'snap/' });
        
        expect(exitCode).toBe(1);
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilityEligibilityDrift": "none",
            "datasetCompatibilityDrift": "none",
            "dependencyClosureDrift": "none",
            "executionModeEligibilityDrift": "none",
            "findingSurfaceDrift": "FINDING_ADDED",
            "ruleActivationDrift": "none",
          }
        `);
        consoleSpy.mockRestore();
    });
});
