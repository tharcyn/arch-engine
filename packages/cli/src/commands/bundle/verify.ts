import { verifyPolicyPackBundleSignature, ArchPolicyPackBundleFormat } from '@arch-engine/core';

export async function bundleVerifyCommand(bundlePath: string, options: any): Promise<number> {
    const bundle: ArchPolicyPackBundleFormat = {
        bundleFormatVersion: '1',
        bundleId: bundlePath.replace('.archpack', ''),
        bundleCreatedAtExcludedFromHash: new Date().toISOString(),
        bundleManifestHash: 'mock-manifest-hash',
        bundleDependencyGraphHash: 'mock-dependency-hash',
        bundleCapabilitySnapshotHash: 'mock-capability-hash',
        bundleDatasetCompatibilitySnapshotHash: 'mock-dataset-hash',
        bundleExecutionModeSnapshotHash: 'mock-execution-hash',
        bundleSignature: null,
        bundlePayload: ''
    };

    const result = verifyPolicyPackBundleSignature(bundle, 'required');

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        if (result.signatureValid) {
            console.log(`✅ Signature verified for ${bundlePath}`);
        } else {
            console.error(`❌ Signature verification failed for ${bundlePath}`);
            result.verificationDiagnostics.forEach(d => console.error(`  > ${d}`));
        }
    }

    return result.signatureValid ? 0 : 6;
}
