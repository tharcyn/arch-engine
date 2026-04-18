import { describe, test, expect, vi } from 'vitest';
import { workspaceBundlePromoteCommand } from '../../../cli/src/commands/workspace/index.js';

describe('Workspace Overlay', () => {
    test('renders deterministic workspace overlay', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await workspaceBundlePromoteCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "workspacePromotionLadder": "tenant-ladder",
          }
        `);
        consoleSpy.mockRestore();
    });
});
