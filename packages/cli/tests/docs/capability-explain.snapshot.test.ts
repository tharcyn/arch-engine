import { describe, test, expect, vi } from 'vitest';
import { capabilityExplainCommand } from '../../src/commands/docs/capability.js';

describe('Capability Explain Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capabilityExplainCommand('authority-boundary', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "authorityCrossingDetectionBehavior": "strict",
            "capabilityId": "authority-boundary",
            "description": "semantic description",
            "evaluationScope": "global",
            "federationEligibility": true,
            "mutationClassificationCoverage": [
              "A",
              "B",
            ],
            "requiredDatasetSchemas": [
              "schema-v1",
            ],
            "supportedExecutionModes": [
              "multi-provider-federated",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
