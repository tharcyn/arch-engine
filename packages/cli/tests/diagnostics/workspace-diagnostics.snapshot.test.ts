import { describe, test, expect } from 'vitest';
import { WorkspaceScanner } from '../../src/workspace-scan/index.js';

describe('Workspace Scanner', () => {
    test('renders deterministic workspace scan', () => {
        const output = WorkspaceScanner.scanWorkspaceTopology();
        expect(output).toMatchInlineSnapshot(`
          {
            "adapters": [
              "adapter-github",
            ],
            "bundles": [
              "my-bundle.archpack",
            ],
            "datasets": [
              "topology-dataset-v1",
            ],
            "lockfiles": [
              "arch-engine.lock.json",
            ],
            "manifests": [
              "pack-manifest.json",
            ],
            "repositories": [
              "repo-main",
            ],
          }
        `);
    });
});
