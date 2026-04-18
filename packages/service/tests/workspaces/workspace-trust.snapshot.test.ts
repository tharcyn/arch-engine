import { describe, test, expect, vi } from 'vitest';
import { workspaceTrustListCommand } from '../../../cli/src/commands/workspace/index.js';

describe('Workspace Trust', () => {
    test('renders deterministic workspace trust overlay', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await workspaceTrustListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "tenantAuthorityDelegation": "delegated",
            "workspaceTrustScope": [
              "tenant-anchor",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
