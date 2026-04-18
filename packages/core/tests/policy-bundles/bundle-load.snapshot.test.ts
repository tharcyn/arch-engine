import { describe, test, expect } from 'vitest';
import { loadPolicyPackBundle } from '../../src/policy-bundles/loadPolicyPackBundle.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';
import { createHash } from 'crypto';

describe('Bundle Load Runtime Contract', () => {
    test('enforces strict hash and capability matching', () => {
        const manifest = {
            bundleId: 'test-bundle',
            bundleVersion: '1.0.0',
            includedPolicyPacks: [],
            dependencyClosure: ['alpha@1.0.0'],
            capabilityCompatibilitySnapshot: ['A'],
            datasetCompatibilitySnapshot: ['schema-1'],
            executionModeCompatibilitySnapshot: 'single-provider',
            federationCompatibilitySnapshot: [],
            lockfileReferenceHash: null,
            bundleIntegrityHash: ''
        };

        const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
        const capHash = createHash('sha256').update(JSON.stringify(['A'])).digest('hex');

        const bundle: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test-bundle',
            bundleCreatedAtExcludedFromHash: 'time',
            bundleManifestHash: manifestHash,
            bundleDependencyGraphHash: createHash('sha256').update(JSON.stringify(manifest.dependencyClosure)).digest('hex'),
            bundleCapabilitySnapshotHash: capHash,
            bundleDatasetCompatibilitySnapshotHash: createHash('sha256').update(JSON.stringify(['schema-1'])).digest('hex'),
            bundleExecutionModeSnapshotHash: createHash('sha256').update(JSON.stringify('single-provider')).digest('hex'),
            bundleSignature: null,
            bundlePayload: Buffer.from(JSON.stringify(manifest)).toString('base64')
        };

        // Match exact capabilities
        const result1 = loadPolicyPackBundle(bundle, ['A'], ['schema-1'], 'single-provider', 'none');
        expect(result1.bundleCompatibilityVerified).toBe(true);

        // Mismatch capabilities
        const result2 = loadPolicyPackBundle(bundle, ['A', 'B'], ['schema-1'], 'single-provider', 'none');
        expect(result2.bundleCompatibilityVerified).toBe(false);
        expect(result2.bundleDiagnostics).toContain('Execution capability mismatch with bundle snapshot.');
    });
});
