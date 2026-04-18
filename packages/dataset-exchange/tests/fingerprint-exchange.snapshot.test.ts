import { describe, test, expect, vi } from 'vitest';
import { datasetExchangePublishCommand } from '../../cli/src/commands/dataset/index.js';

describe('Fingerprint Exchange', () => {
    test('renders deterministic fingerprint exchange', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await datasetExchangePublishCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "dataset-published",
          }
        `);
        consoleSpy.mockRestore();
    });
});
