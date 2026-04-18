import { describe, test, expect, vi } from 'vitest';
import { metricsStabilityCommand, metricsDriftCommand, metricsPolicyEffectivenessCommand } from '../../../cli/src/commands/metrics/index.js';

describe('Metrics', () => {
    test('renders deterministic stability metrics', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsStabilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "regressionRate": 2.1,
            "stabilityIndex": 95.5,
          }
        `);
        consoleSpy.mockRestore();
    });

    test('renders deterministic drift metrics', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsDriftCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "driftVelocityIndex": 1.2,
          }
        `);
        consoleSpy.mockRestore();
    });

    test('renders deterministic policy effectiveness metrics', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await metricsPolicyEffectivenessCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "policyEffectivenessScore": 88,
          }
        `);
        consoleSpy.mockRestore();
    });
});
