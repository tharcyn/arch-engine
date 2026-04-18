import { describe, test, expect, vi } from 'vitest';
import { forecastCapabilityRegressionCommand } from '../../cli/src/commands/forecast/index.js';

describe('Capability Regression', () => {
    test('renders deterministic capability regression forecast', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await forecastCapabilityRegressionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capability-regression-forecasted",
          }
        `);
        consoleSpy.mockRestore();
    });
});
