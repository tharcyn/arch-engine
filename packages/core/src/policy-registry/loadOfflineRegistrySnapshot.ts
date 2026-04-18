import type { RegistryCatalogManifest } from './RegistryCatalogManifest.js';
import type { RegistrySourceDescriptor } from './RegistrySourceDescriptor.js';
import { createHash } from 'crypto';

export interface OfflineRegistrySnapshot {
    readonly snapshotId: string;
    readonly snapshotCreatedAt: string;
    readonly descriptor: RegistrySourceDescriptor;
    readonly catalog: RegistryCatalogManifest;
    readonly snapshotHash: string;
}

export function loadOfflineRegistrySnapshot(
    rawSnapshotPayload: string
): OfflineRegistrySnapshot | null {
    try {
        const parsed = JSON.parse(rawSnapshotPayload);

        // Verify structure roughly
        if (!parsed.snapshotId || !parsed.descriptor || !parsed.catalog || !parsed.snapshotHash) {
            return null;
        }

        // Verify the snapshot integrity natively
        const { snapshotHash, ...payloadWithoutHash } = parsed;
        const computedHash = createHash('sha256').update(JSON.stringify(payloadWithoutHash)).digest('hex');

        if (computedHash !== snapshotHash) {
            // Snapshot integrity violation
            return null;
        }

        // Enforce offline descriptor invariants
        if (parsed.descriptor.registrySourceType !== 'offline-snapshot') {
            return null;
        }

        return parsed as OfflineRegistrySnapshot;
    } catch (e) {
        return null;
    }
}
