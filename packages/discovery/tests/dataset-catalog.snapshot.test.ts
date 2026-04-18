import { describe, test, expect, vi } from 'vitest';
import { discoverDatasetsCommand } from '../../cli/src/commands/discover/index.js';

describe('Dataset Catalog', () => {
    test('renders deterministic dataset discovery', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await discoverDatasetsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "datasets-discovered",
          }
        `);
        consoleSpy.mockRestore();
    });
});
