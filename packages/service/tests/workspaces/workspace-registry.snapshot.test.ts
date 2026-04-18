import { describe, test, expect, vi } from 'vitest';
import { workspaceRegistryListCommand } from '../../../cli/src/commands/workspace/index.js';

describe('Workspace Registry', () => {
    test('renders deterministic workspace registry overlay', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await workspaceRegistryListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "overlayTrustTier": "tier-1",
            "tenantRegistryPriority": "high",
            "workspaceRegistryOverlay": [
              "tenant-registry",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
