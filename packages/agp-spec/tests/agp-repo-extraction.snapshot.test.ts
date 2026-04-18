import { describe, test, expect, vi } from 'vitest';
import { protocolExportAgpRepoCommand } from '../../cli/src/commands/protocol/export.js';

describe('AGP Repo Extraction', () => {
    test('renders deterministic repo extraction structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await protocolExportAgpRepoCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "agp-repo-exported",
          }
        `);
        consoleSpy.mockRestore();
    });
});
