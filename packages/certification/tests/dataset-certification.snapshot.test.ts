import { describe, test, expect, vi } from 'vitest';
import { certifyDatasetCommand } from '../../cli/src/commands/certify/index.js';

describe('Dataset Certification', () => {
    test('renders deterministic dataset certification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await certifyDatasetCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "dataset-certified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
