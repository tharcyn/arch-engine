import { describe, test, expect, vi } from 'vitest';
import { approvalValidateSeparationCommand } from '../../cli/src/commands/approval/index.js';

describe('Separation of Duties', () => {
    test('renders deterministic separation validation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await approvalValidateSeparationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "separation-validated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
