import { describe, test, expect } from 'vitest';
import { computeSnapshotClosureGraphHash, validateSnapshotClosureGraphDivergence } from '../../src/transport/snapshotClosureGraphHash.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Freeze Evidence: Trust Root Epoch Non-Identity Binding', () => {
    test('rotating trustRootEpoch does NOT change closureGraphHash or replay acceptance', () => {
        const baseEntries = [{
            policyId: 'test',
            config: { version: 1 },
            hash: 'hash1',
            policyNamespace: 'core',
            executionMetadata: { capabilityClosureHash: 'hashx' }
        }];

        const epoch1Provenance = {
            manifestContentHash: 'mh',
            signatureDigest: 'sd',
            registryTrustRootId: 'root',
            trustRootEpoch: 1
        };

        const epoch2Provenance = {
            manifestContentHash: 'mh',
            signatureDigest: 'sd',
            registryTrustRootId: 'root',
            trustRootEpoch: 2
        };

        const hash1 = computeSnapshotClosureGraphHash(baseEntries, [], epoch1Provenance);
        const hash2 = computeSnapshotClosureGraphHash(baseEntries, [], epoch2Provenance);

        // MUST be identical.
        expect(hash1).toBe(hash2);

        // Validation MUST NOT throw on epoch mismatch alone
        expect(() => {
            validateSnapshotClosureGraphDivergence(hash1, hash2);
        }).not.toThrow();
    });
});
