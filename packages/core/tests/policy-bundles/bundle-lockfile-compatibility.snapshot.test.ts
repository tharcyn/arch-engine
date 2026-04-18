import { describe, test, expect } from 'vitest';
import { verifyBundleLockfileCompatibility } from '../../src/policy-bundles/verifyBundleLockfileCompatibility.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';
import type { PolicyPackLockfile } from '../../src/policy-registry/generatePolicyPackLockfile.js';

describe('Bundle Lockfile Compatibility Contract', () => {
    test('detects drift between bundle hashes and locked execution environment', () => {
        const bundle: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test',
            bundleCreatedAtExcludedFromHash: '',
            bundleManifestHash: '',
            bundleDependencyGraphHash: '',
            bundleCapabilitySnapshotHash: 'hash-cap-1',
            bundleDatasetCompatibilitySnapshotHash: 'hash-data-1',
            bundleExecutionModeSnapshotHash: 'hash-mode-1',
            bundleSignature: null,
            bundlePayload: Buffer.from(JSON.stringify({
                dependencyClosure: ['alpha@1.0.0'],
                includedPolicyPacks: [{ policyPackId: 'alpha' }]
            })).toString('base64')
        };

        const lockfile: PolicyPackLockfile = {
            lockfileVersion: '1',
            generatedAtExcludedFromHash: '',
            capabilityIntersectionHash: 'hash-cap-1',
            datasetCompatibilityHash: 'hash-data-2', // DRIFT
            executionModeHash: 'hash-mode-1',
            federationExecutionHash: '',
            policyPacks: [
                {
                    policyPackId: 'alpha',
                    resolvedVersion: '1.0.0',
                    manifestHash: '',
                    dependencyHash: '',
                    capabilityCompatibilityHash: '',
                    datasetCompatibilityHash: '',
                    executionModeCompatibilityHash: ''
                }
            ]
        };

        const result = verifyBundleLockfileCompatibility(bundle, lockfile);
        expect(result.lockfileCompatible).toBe(false);
        expect(result.datasetMismatch.length).toBe(1);
    });
});
