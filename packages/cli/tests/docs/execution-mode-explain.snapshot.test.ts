import { describe, test, expect, vi } from 'vitest';
import { executionModesExplainCommand } from '../../src/commands/docs/executionMode.js';

describe('Execution Mode Explain Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await executionModesExplainCommand('multi-provider-federated', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "bundleCompatibility": true,
            "datasetCompatibilityExpectations": [
              "schema-v1",
            ],
            "federationEligibility": true,
            "lockfileCompatibility": true,
            "modeDescription": "Executes against isolated contexts",
            "modeId": "multi-provider-federated",
            "offlineCompatibility": true,
            "providerCompatibilityRules": [
              "single",
              "federated",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
