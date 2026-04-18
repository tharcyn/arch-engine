import { describe, test, expect, vi } from 'vitest';
import { standardsDatasetsCommand } from '../../cli/src/commands/standards/index.js';

describe('Dataset Profile', () => {
    test('renders deterministic dataset profile', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await standardsDatasetsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "datasets-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
