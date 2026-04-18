import { describe, test, expect, vi } from 'vitest';
import { assuranceRegenerateCommand } from '../../cli/src/commands/assurance/index.js';

describe('Evidence Regeneration', () => {
    test('renders deterministic regeneration linkage', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceRegenerateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "evidence-regenerated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
