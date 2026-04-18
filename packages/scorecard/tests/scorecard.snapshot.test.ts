import { describe, test, expect, vi } from 'vitest';
import { scorecardGenerateCommand } from '../../cli/src/commands/scorecard/index.js';

describe('Governance Scorecard', () => {
    test('renders deterministic scorecard generation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await scorecardGenerateCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "scorecard-generated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
