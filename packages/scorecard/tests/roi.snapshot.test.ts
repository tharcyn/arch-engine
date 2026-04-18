import { describe, test, expect, vi } from 'vitest';
import { scorecardRoiCommand } from '../../cli/src/commands/scorecard/index.js';

describe('ROI Attribution', () => {
    test('renders deterministic ROI attribution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await scorecardRoiCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "roi-measured",
          }
        `);
        consoleSpy.mockRestore();
    });
});
