import { describe, test, expect, vi } from 'vitest';
import { hooksInstallCommand } from '../../src/commands/hooks/install.js';

describe('Pre-commit Hook Output', () => {
    test('renders deterministic pre-commit hook json', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await hooksInstallCommand({ json: true, failOn: 'severity>=high' });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "executable": "arch-engine gate local",
            "failOn": "severity>=high",
            "hookPath": ".git/hooks/pre-commit",
            "status": "installed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
