import { describe, test, expect, vi } from 'vitest';
import { proveDatasetCommand } from '../../cli/src/commands/prove/index.js';

describe('Dataset Proof', () => {
    test('renders deterministic dataset proof', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await proveDatasetCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "dataset-proven",
          }
        `);
        consoleSpy.mockRestore();
    });
});
