import { describe, test, expect } from 'vitest';
import { resolveBundlePromotionStage } from '../../src/policy-bundles/resolveBundlePromotionStage.js';
import type { ArchPolicyPackBundleFormat } from '../../src/policy-bundles/ArchPolicyPackBundleFormat.js';

describe('Promotion Decision Contract', () => {
    test('determines promotion safely based on signature boundary', () => {
        const bundleUnsigned: ArchPolicyPackBundleFormat = {
            bundleFormatVersion: '1',
            bundleId: 'test-bundle',
            bundleCreatedAtExcludedFromHash: '',
            bundleManifestHash: '',
            bundleDependencyGraphHash: '',
            bundleCapabilitySnapshotHash: '',
            bundleDatasetCompatibilitySnapshotHash: '',
            bundleExecutionModeSnapshotHash: '',
            bundleSignature: null,
            bundlePayload: ''
        };

        const bundleSigned: ArchPolicyPackBundleFormat = {
            ...bundleUnsigned,
            bundleSignature: 'valid-bundle-sig-org'
        };

        expect(resolveBundlePromotionStage(bundleUnsigned, 'verified', 'development')).toMatchInlineSnapshot(`
          {
            "approvedStage": "development",
            "promotionDiagnostics": [
              "Promotion to verified requires a valid signature.",
            ],
            "promotionPermitted": false,
          }
        `);

        expect(resolveBundlePromotionStage(bundleSigned, 'production', 'verified')).toMatchInlineSnapshot(`
          {
            "approvedStage": "production",
            "promotionDiagnostics": [
              "Promotion to production permitted.",
            ],
            "promotionPermitted": true,
          }
        `);
    });
});
