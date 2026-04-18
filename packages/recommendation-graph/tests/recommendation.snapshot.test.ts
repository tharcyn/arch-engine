import { describe, test, expect, vi } from 'vitest';
import { recommendBaselineCommand } from '../../cli/src/commands/recommend/index.js';

describe('Recommendation Graph', () => {
    test('renders deterministic baseline recommendation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await recommendBaselineCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "baseline-recommended",
          }
        `);
        consoleSpy.mockRestore();
    });
});
