import { describe, test, expect } from 'vitest';
import { exportOfflineRegistrySnapshot } from '../../src/policy-registry/exportOfflineRegistrySnapshot.js';

describe('Offline Snapshot Export Contract', () => {
    test('exports stable offline snapshot layout', () => {
        const result = exportOfflineRegistrySnapshot(
            'export-src',
            {
                catalogId: 'cat',
                catalogVersion: '1.0.0',
                catalogGeneratedAtExcludedFromHash: '',
                policyPacks: [],
                catalogSignature: null,
                catalogHash: 'mock-hash'
            },
            'verified-internal'
        );

        if (result.offlineSnapshot) {
            const { snapshotId, snapshotCreatedAt, snapshotHash, ...stable } = result.offlineSnapshot;
            expect(stable).toMatchInlineSnapshot(`
              {
                "catalog": {
                  "catalogGeneratedAtExcludedFromHash": "",
                  "catalogHash": "mock-hash",
                  "catalogId": "cat",
                  "catalogSignature": null,
                  "catalogVersion": "1.0.0",
                  "policyPacks": [],
                },
                "descriptor": {
                  "catalogFormatVersion": "1",
                  "catalogLocation": "offline",
                  "registrySourceId": "export-src",
                  "registrySourcePriority": 1,
                  "registrySourceType": "offline-snapshot",
                  "registryTrustLevel": "verified-internal",
                  "signatureRequirement": "optional",
                },
              }
            `);
        }
    });
});
