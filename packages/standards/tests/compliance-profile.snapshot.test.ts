import { describe, test, expect, vi } from 'vitest';
import { standardsComplianceProfilesCommand } from '../../cli/src/commands/standards/index.js';

describe('Compliance Profile', () => {
    test('renders deterministic compliance profile', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await standardsComplianceProfilesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "compliance-profiles-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
