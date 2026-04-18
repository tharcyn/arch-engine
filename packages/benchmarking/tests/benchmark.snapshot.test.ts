import { describe, test, expect, vi } from 'vitest';
import { benchmarkMaturityCommand } from '../../cli/src/commands/benchmark/index.js';

describe('Benchmark Exchange', () => {
    test('renders deterministic maturity benchmark', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await benchmarkMaturityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "maturity-benchmarked",
          }
        `);
        consoleSpy.mockRestore();
    });
});
