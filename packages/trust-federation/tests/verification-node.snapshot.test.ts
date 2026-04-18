import { describe, test, expect, vi } from 'vitest';
import { verifyCertificationCommand } from '../../cli/src/commands/verify/index.js';

describe('Verification Node', () => {
    test('renders deterministic verification node', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await verifyCertificationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "certification-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
