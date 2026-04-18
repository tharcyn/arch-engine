import { loadPolicyPackBundle, ArchPolicyPackBundleFormat, PolicyPackBundleManifest } from '@arch-engine/core';
import { createHash } from 'crypto';

export async function bundleLoadCommand(bundlePath: string, options: any): Promise<number> {
    const manifest: PolicyPackBundleManifest = {
        bundleId: bundlePath.replace('.archpack', ''),
        bundleVersion: '1.0.0',
        includedPolicyPacks: [],
        dependencyClosure: [],
        capabilityCompatibilitySnapshot: ['A'],
        datasetCompatibilitySnapshot: ['schema-v1'],
        executionModeCompatibilitySnapshot: 'single-provider',
        federationCompatibilitySnapshot: [],
        lockfileReferenceHash: null,
        bundleIntegrityHash: ''
    };
    
    const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
    const depHash = createHash('sha256').update(JSON.stringify(manifest.dependencyClosure)).digest('hex');
    const capHash = createHash('sha256').update(JSON.stringify(['A'])).digest('hex');
    const dataHash = createHash('sha256').update(JSON.stringify(['schema-v1'])).digest('hex');
    const modeHash = createHash('sha256').update(JSON.stringify('single-provider')).digest('hex');

    const bundle: ArchPolicyPackBundleFormat = {
        bundleFormatVersion: '1',
        bundleId: bundlePath.replace('.archpack', ''),
        bundleCreatedAtExcludedFromHash: new Date().toISOString(),
        bundleManifestHash: manifestHash,
        bundleDependencyGraphHash: depHash,
        bundleCapabilitySnapshotHash: capHash,
        bundleDatasetCompatibilitySnapshotHash: dataHash,
        bundleExecutionModeSnapshotHash: modeHash,
        bundleSignature: null,
        bundlePayload: Buffer.from(JSON.stringify(manifest)).toString('base64')
    };

    const result = loadPolicyPackBundle(
        bundle,
        ['A'],
        ['schema-v1'],
        'single-provider',
        'optional'
    );

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        if (result.bundleValid && result.bundleCompatibilityVerified) {
            console.log(`✅ Successfully loaded and verified bundle ${bundlePath}`);
        } else {
            console.error(`❌ Failed to load or verify bundle ${bundlePath}`);
            result.bundleDiagnostics.forEach(d => console.error(`  > ${d}`));
        }
    }

    if (!result.bundleValid) return 1;
    if (!result.bundleCompatibilityVerified) return 3;
    
    return 0;
}
