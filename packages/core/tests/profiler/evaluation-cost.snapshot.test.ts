import { describe, test, expect, vi } from 'vitest';
import { costEvaluateCommand } from '../../../cli/src/commands/cost/index.js';

describe('Evaluation Cost', () => {
    test('renders deterministic evaluation cost estimate', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await costEvaluateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilityIntersectionWidth": 5,
            "datasetSchemaSize": 500,
            "estimatedCost": 150,
            "federationProviderCount": 2,
            "policyPackDependencyDepth": 3,
            "topologyEdgeCount": 120,
            "topologyNodeCount": 50,
          }
        `);
        consoleSpy.mockRestore();
    });
});
