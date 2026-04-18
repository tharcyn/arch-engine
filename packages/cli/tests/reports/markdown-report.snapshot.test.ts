import { describe, test, expect, vi } from 'vitest';
import { reportEvaluateCommand } from '../../src/commands/report/index.js';

describe('Markdown Report', () => {
    test('renders deterministic markdown report', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await reportEvaluateCommand({ format: 'markdown', json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "report": "# Governance Report## Evaluation Summary## Severity Table",
          }
        `);
        consoleSpy.mockRestore();
    });
});
