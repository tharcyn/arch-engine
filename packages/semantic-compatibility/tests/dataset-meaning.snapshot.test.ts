import { describe, test, expect, vi } from 'vitest';
import { semanticTranslateDatasetCommand } from '../../cli/src/commands/semantic/index.js';

describe('Dataset Meaning', () => {
    test('renders deterministic dataset meaning', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await semanticTranslateDatasetCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "dataset-translated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
