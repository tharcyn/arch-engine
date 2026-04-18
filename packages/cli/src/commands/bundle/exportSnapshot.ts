import { exportOfflineRegistrySnapshot, RegistryCatalogManifest } from '@arch-engine/core';
import { writeFileSync } from 'fs';

export async function bundleExportSnapshotCommand(options: any): Promise<number> {
    const catalog: RegistryCatalogManifest = {
        catalogId: 'cat-offline',
        catalogVersion: '1.0.0',
        catalogGeneratedAtExcludedFromHash: '',
        policyPacks: [],
        catalogSignature: null,
        catalogHash: ''
    };

    const result = exportOfflineRegistrySnapshot('export-source', catalog, 'verified-internal');

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        if (result.exportSuccessful) {
            console.log(`✅ Successfully exported offline snapshot.`);
            if (options.output && result.snapshotPayloadString) {
                writeFileSync(options.output, result.snapshotPayloadString, 'utf-8');
                console.log(`Saved to ${options.output}`);
            }
        } else {
            console.error(`❌ Failed to export offline snapshot.`);
            result.exportDiagnostics.forEach(d => console.error(`  > ${d}`));
        }
    }

    return result.exportSuccessful ? 0 : 6;
}
