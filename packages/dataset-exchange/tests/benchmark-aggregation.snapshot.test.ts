import { describe, test, expect, vi } from 'vitest';
import { datasetBenchmarkAggregateCommand } from '../../cli/src/commands/dataset/index.js';

describe('Benchmark Aggregation', () => {
    test('renders deterministic benchmark aggregation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await datasetBenchmarkAggregateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "benchmark-aggregated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
