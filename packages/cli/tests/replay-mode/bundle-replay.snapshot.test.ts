import { describe, test, expect, vi } from 'vitest';
import { replayBundleCommand } from '../../src/commands/replay/diff.js';

describe('Bundle Replay Diff', () => {
    test('detects bundle replay drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await replayBundleCommand('bundle-a.archpack', 'bundle-b.archpack', { json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "bundleCapabilitySnapshotHashDrift": "changed",
            "bundleDatasetCompatibilitySnapshotHashDrift": "unchanged",
            "bundleDependencyGraphHashDrift": "changed",
            "bundleExecutionModeSnapshotHashDrift": "unchanged",
            "bundleSignerIdentityDrift": "unchanged",
            "bundleSourceCatalogSetHashDrift": "unchanged",
            "bundleSourceRegistrySetHashDrift": "unchanged",
          }
        `);
        consoleSpy.mockRestore();
    });
});
