import { describe, test, expect, vi } from 'vitest';
import { replayLockfileCommand } from '../../src/commands/replay/diff.js';

describe('Lockfile Replay Diff', () => {
    test('detects lockfile replay drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayLockfileCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilityMatrixDrift": "CAPABILITY_REMOVED",
            "datasetCompatibilityDrift": "none",
            "dependencyClosureDrift": "none",
            "registryResolutionDrift": "RESOLVED_TO_NEWER_PATCH",
          }
        `);
        consoleSpy.mockRestore();
    });
});
