import { describe, test, expect, vi } from 'vitest';
import { specBuildPortalCommand } from '../../cli/src/commands/spec/index.js';

describe('AGP Spec Publication', () => {
    test('renders deterministic spec portal generation output structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await specBuildPortalCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "portal-built",
          }
        `);
        consoleSpy.mockRestore();
    });
});
