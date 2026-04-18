import { describe, test, expect, vi } from 'vitest';
import { capabilityGraphCommand } from '../../src/commands/docs/capabilityGraph.js';

describe('Capability Graph Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capabilityGraphCommand({ json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "capabilityDependencies": [
              "directionality-analysis",
            ],
            "capabilityIntersections": [
              "authority-boundary",
            ],
            "datasetRequirements": [
              "schema-v1",
            ],
            "edges": [
              {
                "source": "authority-boundary",
                "target": "directionality-analysis",
              },
              {
                "source": "directionality-analysis",
                "target": "invocation-edges",
              },
            ],
            "executionModeEligibility": [
              "multi-provider-federated",
            ],
            "nodes": [
              "authority-boundary",
              "directionality-analysis",
              "invocation-edges",
            ],
            "policyPackProviders": [
              "alpha",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
