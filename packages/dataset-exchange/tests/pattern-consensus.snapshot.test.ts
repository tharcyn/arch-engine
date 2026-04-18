import { describe, test, expect, vi } from 'vitest';
import { datasetLearningAggregateCommand } from '../../cli/src/commands/dataset/index.js';

describe('Pattern Consensus', () => {
    test('renders deterministic pattern consensus', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await datasetLearningAggregateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "learning-aggregated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
