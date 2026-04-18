import { describe, test, expect, vi } from 'vitest';
import { loadFederatedTopologyDatasets } from '../../src/federation/loadFederatedTopologyDatasets.js';
import * as ingestion from '../../src/topology/DatasetIngestionPipeline.js';

vi.mock('../../src/topology/DatasetIngestionPipeline.js', () => ({
    runDatasetIngestionPipeline: vi.fn((path) => {
        return {
            topology_dataset_identity: {
                dataset_name: path.replace('.json', ''),
                dataset_semver: '1.0.0'
            },
            topology_capability_manifest: {
                supports_magic: true,
                supports_extra: path.includes('github')
            }
        };
    })
}));

describe('Federated Dataset Ingestion', () => {
    test('deterministic dataset ordering and identity parsing', () => {
        const inputs = [
            { providerId: 'gitlab', datasetPath: 'gitlab.json' },
            { providerId: 'github', datasetPath: 'github.json' }
        ];

        const result = loadFederatedTopologyDatasets(inputs);

        // Github should come before gitlab due to alphabetical sorting
        expect(result.datasets[0].topology_dataset_identity.dataset_name).toBe('github');
        expect(result.datasets[1].topology_dataset_identity.dataset_name).toBe('gitlab');

        // Capability intersection: both have magic, only github has extra
        expect(result.datasetCapabilityIntersection).toEqual({ supports_magic: true });
        
        // Capability union: magic and extra
        expect(result.datasetCapabilityUnion).toEqual({ supports_magic: true, supports_extra: true });
    });

    test('rejects dataset identity collisions', () => {
        const inputs = [
            { providerId: 'github1', datasetPath: 'github.json' },
            { providerId: 'github2', datasetPath: 'github.json' }
        ];

        expect(() => loadFederatedTopologyDatasets(inputs)).toThrow(/Dataset identity collision/);
    });
});
