import { describe, test, expect, vi } from 'vitest';
import { forecastTopologyStabilityCommand } from '../../cli/src/commands/forecast/index.js';

describe('Topology Stability', () => {
    test('renders deterministic topology stability forecast', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await forecastTopologyStabilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "topology-stability-forecasted",
          }
        `);
        consoleSpy.mockRestore();
    });
});
