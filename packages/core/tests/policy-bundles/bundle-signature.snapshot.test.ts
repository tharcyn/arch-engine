import { describe, test, expect } from 'vitest';
import { verifyPolicyPackBundleSignature } from '../../src/policy-bundles/verifyPolicyPackBundleSignature.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';

describe('Bundle Signature Contract', () => {
    test('enforces bundle signature boundary', () => {
        const bundle: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test',
            bundleCreatedAtExcludedFromHash: '',
            bundleManifestHash: '',
            bundleDependencyGraphHash: '',
            bundleCapabilitySnapshotHash: '',
            bundleDatasetCompatibilitySnapshotHash: '',
            bundleExecutionModeSnapshotHash: '',
            bundleSignature: 'valid-bundle-sig-trusted-org',
            bundlePayload: ''
        };

        const result = verifyPolicyPackBundleSignature(bundle, 'required');
        
        expect(result).toMatchInlineSnapshot(`
          {
            "signatureAlgorithm": "placeholder-crypto-v1",
            "signatureValid": true,
            "trustedSigner": "trusted-org",
            "verificationDiagnostics": [
              "Bundle signature mathematically verified.",
            ],
          }
        `);
    });
});
