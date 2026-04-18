import { describe, test, expect } from 'vitest';
import { createFederatedExecutionContext } from '../../src/federation/createFederatedExecutionContext.js';
import type { ValidatedTopologyDataset } from '../../src/topology/external-topology-types.js';

vi.mock('../../src/topology/projectValidatedDatasetToValidatorView.js', () => ({
    projectValidatedDatasetToValidatorView: vi.fn((ds) => ds)
}));

vi.mock('../../src/topology/extractTopologyGraph.js', () => ({
    extractTopologyGraph: vi.fn((view) => view.dataset.topology_graph)
}));

describe('Federation Adversarial Merging', () => {
    test('resolves perfectly overlapping nodes and accumulates provenance array', () => {
        const githubDs: any = {
            dataset: {
                topology_dataset_identity: { dataset_name: 'repo', dataset_semver: '1' },
                topology_graph: {
                    nodes: [{ id: 'node-A', name: 'Service A' }],
                    edges: []
                }
            }
        };

        const gitlabDs: any = {
            dataset: {
                topology_dataset_identity: { dataset_name: 'repo', dataset_semver: '1' },
                topology_graph: {
                    nodes: [{ id: 'node-A', name: 'Service A' }], // Exact same logical node
                    edges: []
                }
            }
        };

        const context = createFederatedExecutionContext(
            { github: githubDs, gitlab: gitlabDs },
            {},
            {},
            ['hash-gh', 'hash-gl']
        );

        const nodes = context.mergedTopologyDataset.nodes;
        expect(nodes.length).toBe(1); // Merged into 1
        expect(nodes[0].providerProvenance).toContain('github');
        expect(nodes[0].providerProvenance).toContain('gitlab');
    });

    test('maintains distinct identities for same-labeled but distinct-ID nodes', () => {
        const githubDs: any = {
            dataset: {
                topology_dataset_identity: { dataset_name: 'repo1', dataset_semver: '1' },
                topology_graph: {
                    nodes: [{ id: 'node-A-gh', name: 'Service A' }],
                    edges: []
                }
            }
        };

        const gitlabDs: any = {
            dataset: {
                topology_dataset_identity: { dataset_name: 'repo2', dataset_semver: '1' },
                topology_graph: {
                    nodes: [{ id: 'node-B-gl', name: 'Service A' }], // Same name, different ID
                    edges: []
                }
            }
        };

        const context = createFederatedExecutionContext(
            { github: githubDs, gitlab: gitlabDs },
            {},
            {},
            ['hash-gh', 'hash-gl']
        );

        const nodes = context.mergedTopologyDataset.nodes;
        expect(nodes.length).toBe(2); // Should not aggressively merge just by label
    });
});
