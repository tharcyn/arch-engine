import { describe, test, expect, vi } from 'vitest';
import { createFederatedExecutionContext } from '../../src/federation/createFederatedExecutionContext.js';

vi.mock('../../src/topology/extractTopologyGraph.js', () => ({
    extractTopologyGraph: vi.fn(() => ({ nodes: [{ id: '1' }], edges: [] }))
}));

vi.mock('../../src/topology/projectValidatedDatasetToValidatorView.js', () => ({
    projectValidatedDatasetToValidatorView: vi.fn((ds) => ds)
}));

describe('Federated Execution Context', () => {
    test('synthesizes federated execution context preserving provider identity isolation', () => {
        const datasets = {
            github: { topology_dataset_identity: { dataset_name: 'gh' } },
            gitlab: { topology_dataset_identity: { dataset_name: 'gl' } }
        };

        const context = createFederatedExecutionContext(
            datasets as any,
            { supports_magic: true },
            { supports_magic: true },
            ['hash1', 'hash2']
        );

        expect(context.providers.length).toBe(2);
        expect(context.providers[0].providerId).toBe('github');
        expect(context.providers[1].providerId).toBe('gitlab');
        expect(context.federationExecutionHash).toBeDefined();
        expect(context.mergedTopologyDataset.nodes.length).toBe(1); // deduplicated node 1
    });
});
