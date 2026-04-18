import { describe, test, expect, vi } from 'vitest';
import { assuranceExportSubmissionCommand } from '../../cli/src/commands/assurance/index.js';

describe('Submission Bundle', () => {
    test('renders deterministic submission bundle', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceExportSubmissionCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "submission-exported",
          }
        `);
        consoleSpy.mockRestore();
    });
});
