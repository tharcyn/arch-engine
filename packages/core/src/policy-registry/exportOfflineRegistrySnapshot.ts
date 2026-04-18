import { createHash } from 'crypto';
import type { RegistryCatalogManifest } from './RegistryCatalogManifest.js';
import type { RegistrySourceDescriptor } from './RegistrySourceDescriptor.js';
import type { OfflineRegistrySnapshot } from './loadOfflineRegistrySnapshot.js';

export interface OfflineSnapshotExportResult {
    readonly exportSuccessful: boolean;
    readonly offlineSnapshot: OfflineRegistrySnapshot | null;
    readonly snapshotPayloadString: string | null;
    readonly exportDiagnostics: readonly string[];
}

export function exportOfflineRegistrySnapshot(
    sourceId: string,
    catalog: RegistryCatalogManifest,
    trustLevel: 'verified-internal' | 'verified-ecosystem' | 'unverified'
): OfflineSnapshotExportResult {
    const diagnostics: string[] = [];

    const descriptor: RegistrySourceDescriptor = {
        registrySourceId: sourceId,
        registrySourceType: 'offline-snapshot',
        registrySourcePriority: 1,
        registryTrustLevel: trustLevel,
        catalogLocation: 'offline',
        catalogFormatVersion: '1',
        signatureRequirement: 'optional'
    };

    const snapshotId = `snapshot-${sourceId}-${Date.now()}`;
    const snapshotCreatedAt = new Date().toISOString();

    const snapshotBase = {
        snapshotId,
        snapshotCreatedAt,
        descriptor,
        catalog
    };

    const snapshotHash = createHash('sha256').update(JSON.stringify(snapshotBase)).digest('hex');

    const offlineSnapshot: OfflineRegistrySnapshot = {
        ...snapshotBase,
        snapshotHash
    };

    const payload = JSON.stringify(offlineSnapshot);

    diagnostics.push(`Offline snapshot generated successfully with hash ${snapshotHash}.`);

    return {
        exportSuccessful: true,
        offlineSnapshot,
        snapshotPayloadString: payload,
        exportDiagnostics: diagnostics
    };
}
