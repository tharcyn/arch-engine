import { describe, test, expect } from 'vitest';
import { loadOfflineRegistrySnapshot } from '../../src/policy-registry/loadOfflineRegistrySnapshot.js';
import { createHash } from 'crypto';

describe('Offline Snapshot Loading Contract', () => {
    test('loads and verifies offline snapshot integrity', () => {
        const rawPayload = {
            snapshotId: 'offline-env-v1',
            snapshotCreatedAt: 'timestamp',
            descriptor: {
                registrySourceId: 'airgapped-src',
                registrySourceType: 'offline-snapshot',
                registrySourcePriority: 1,
                registryTrustLevel: 'verified-internal',
                catalogLocation: 'in-memory',
                catalogFormatVersion: '1',
                signatureRequirement: 'none'
            },
            catalog: {
                catalogId: 'cat1',
                catalogVersion: '1',
                catalogGeneratedAtExcludedFromHash: '',
                policyPacks: [],
                catalogSignature: null,
                catalogHash: 'hash-abc'
            }
        };

        const computedHash = createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex');
        
        const validPayloadStr = JSON.stringify({
            ...rawPayload,
            snapshotHash: computedHash
        });

        const loaded = loadOfflineRegistrySnapshot(validPayloadStr);
        expect(loaded).toBeTruthy();
        expect(loaded?.snapshotId).toBe('offline-env-v1');

        // Test tampering
        const tamperedPayloadStr = JSON.stringify({
            ...rawPayload,
            snapshotHash: 'fake-hash-123'
        });

        const loadedTampered = loadOfflineRegistrySnapshot(tamperedPayloadStr);
        expect(loadedTampered).toBeNull();
    });
});
