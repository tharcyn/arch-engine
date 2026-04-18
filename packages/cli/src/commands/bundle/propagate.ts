import { propagateBundleAcrossMirrors, ArchPolicyPackBundleFormat, RegistrySourceDescriptor } from '@arch-engine/core';

export async function bundlePropagateCommand(bundlePath: string, options: any): Promise<number> {
    const bundle: ArchPolicyPackBundleFormat = {
        bundleFormatVersion: '1',
        bundleId: bundlePath.replace('.archpack', ''),
        bundleCreatedAtExcludedFromHash: new Date().toISOString(),
        bundleManifestHash: 'mock',
        bundleDependencyGraphHash: 'mock',
        bundleCapabilitySnapshotHash: 'mock',
        bundleDatasetCompatibilitySnapshotHash: 'mock',
        bundleExecutionModeSnapshotHash: 'mock',
        bundleSignature: null,
        bundlePayload: Buffer.from(JSON.stringify({ includedPolicyPacks: [] })).toString('base64')
    };

    const mirrors: RegistrySourceDescriptor[] = [
        {
            registrySourceId: 'mirror-1',
            registrySourceType: 'filesystem-mirror',
            registrySourcePriority: 2,
            registryTrustLevel: 'verified-internal',
            catalogLocation: '',
            catalogFormatVersion: '1',
            signatureRequirement: 'none'
        }
    ];

    const result = propagateBundleAcrossMirrors(bundle, mirrors, new Map());

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return result.propagationSuccessful ? 0 : 5;
    }

    if (result.propagationSuccessful) {
        console.log(`✅ Bundle successfully propagated across mirrors.`);
        result.propagatedMirrors.forEach(m => console.log(`  > ${m}`));
        return 0;
    } else {
        console.error(`❌ Bundle propagation encountered failures.`);
        result.propagationDiagnostics.forEach(d => console.error(`  > ${d}`));
        return 5;
    }
}
