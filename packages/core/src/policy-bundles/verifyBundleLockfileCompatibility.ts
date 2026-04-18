import type { ArchPolicyPackBundleFormat } from './ArchPolicyPackBundleFormat.js';
import type { PolicyPackLockfile } from '../policy-registry/generatePolicyPackLockfile.js';

export interface BundleLockfileCompatibilityResult {
    readonly lockfileCompatible: boolean;
    readonly capabilityMismatch: readonly string[];
    readonly datasetMismatch: readonly string[];
    readonly executionModeMismatch: readonly string[];
    readonly dependencyMismatch: readonly string[];
}

export function verifyBundleLockfileCompatibility(
    bundle: ArchPolicyPackBundleFormat,
    lockfile: PolicyPackLockfile
): BundleLockfileCompatibilityResult {
    const capabilityMismatch: string[] = [];
    const datasetMismatch: string[] = [];
    const executionModeMismatch: string[] = [];
    const dependencyMismatch: string[] = [];

    if (bundle.bundleCapabilitySnapshotHash !== lockfile.capabilityIntersectionHash) {
        capabilityMismatch.push(`Bundle capability hash ${bundle.bundleCapabilitySnapshotHash} does not match lockfile hash ${lockfile.capabilityIntersectionHash}`);
    }

    if (bundle.bundleDatasetCompatibilitySnapshotHash !== lockfile.datasetCompatibilityHash) {
        datasetMismatch.push(`Bundle dataset hash ${bundle.bundleDatasetCompatibilitySnapshotHash} does not match lockfile hash ${lockfile.datasetCompatibilityHash}`);
    }

    if (bundle.bundleExecutionModeSnapshotHash !== lockfile.executionModeHash) {
        executionModeMismatch.push(`Bundle execution mode hash ${bundle.bundleExecutionModeSnapshotHash} does not match lockfile hash ${lockfile.executionModeHash}`);
    }

    // For simplicity, we check if the entire bundle dependency closure represents exactly the same packs locked.
    // In actual implementation, we might do deep diffing. Here we just rely on the integrity that the lockfile
    // provides deterministic behavior. Since the lockfile itself contains hashes of dependencies per pack,
    // we would structurally compare them. 
    // We will simulate the check here by checking if the bundle dependency hash logic aligns or simply if any packs differ.

    const lockfilePackIds = new Set(lockfile.policyPacks.map(p => p.policyPackId));
    // Since we don't have manifest directly here, we could parse the bundle.
    // For this interface, we just provide the structural scaffolding.
    try {
        const payloadStr = Buffer.from(bundle.bundlePayload, 'base64').toString('utf-8');
        const manifest = JSON.parse(payloadStr);

        for (const dep of manifest.dependencyClosure) {
            const packId = dep.split('@')[0];
            if (!lockfilePackIds.has(packId)) {
                dependencyMismatch.push(`Bundle contains dependency ${dep} not present in lockfile.`);
            }
        }

        // We can also verify that all lockfile packs are in the bundle.
        const bundlePackIds = new Set(manifest.includedPolicyPacks.map((p: any) => p.policyPackId));
        for (const pack of lockfile.policyPacks) {
            if (!bundlePackIds.has(pack.policyPackId)) {
                dependencyMismatch.push(`Lockfile requires ${pack.policyPackId} but it is missing from bundle.`);
            }
        }

    } catch (e) {
        dependencyMismatch.push('Failed to parse bundle payload for lockfile comparison.');
    }

    const lockfileCompatible = 
        capabilityMismatch.length === 0 &&
        datasetMismatch.length === 0 &&
        executionModeMismatch.length === 0 &&
        dependencyMismatch.length === 0;

    return {
        lockfileCompatible,
        capabilityMismatch,
        datasetMismatch,
        executionModeMismatch,
        dependencyMismatch
    };
}
