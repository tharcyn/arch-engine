import { describe, test, expect, vi } from 'vitest';
import { metricsDatasetEvolutionCommand } from '../../../cli/src/commands/metrics/index.js';

describe('Dataset History', () => {
    test('renders deterministic dataset history', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsDatasetEvolutionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "datasetCompatibilityDrift": [
              "drift-1",
            ],
            "federationEligibilityTransitions": [
              "eligible",
            ],
            "migrationVelocity": 10.5,
            "schemaRemovals": [
              "schema-v1",
            ],
            "schemaUpgrades": [
              "schema-v2",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
