import { describe, test, expect, vi } from 'vitest';
import { reportEvaluateCommand } from '../../src/commands/report/index.js';

describe('HTML Report', () => {
    test('renders deterministic html report', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await reportEvaluateCommand({ format: 'html', json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "report": "<html><body><h1>Governance Report</h1></body></html>",
          }
        `);
        consoleSpy.mockRestore();
    });
});
