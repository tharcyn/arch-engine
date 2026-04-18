import { describe, test, expect, vi } from 'vitest';
import { benchmarkPercentileCommand } from '../../cli/src/commands/benchmark/index.js';

describe('Maturity Percentile', () => {
    test('renders deterministic percentile benchmark', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await benchmarkPercentileCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "percentile-benchmarked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
