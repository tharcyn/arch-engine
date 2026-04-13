import { describe, test, expect } from 'vitest';
import { computeCompatibilityScoreDeterministic } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Deterministic Compatibility Score', () => {
    test('Compatibility scoring remains identical across unordered arrays and missing fields', () => {
        const scoreA = computeCompatibilityScoreDeterministic({
            overlaySourceId: 'A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1,
            compatibilityRecord: {
                compatibleWithCoreVersions: ['3.0', '1.0', '2.0', '2.0'], // length 3 when uniq'd
                requiresCapabilities: ['cap-A'] // length 1
            }
        });

        const scoreB = computeCompatibilityScoreDeterministic({
            overlaySourceId: 'B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1,
            compatibilityRecord: {
                compatibleWithCoreVersions: ['1.0', '2.0', '3.0'], // identical underlying uniquely
                requiresCapabilities: ['cap-A']
            }
        });

        expect(scoreA).toBe(scoreB);
        expect(scoreA).toBe(4);
    });

    test('Missing properties correctly evaluate to zero', () => {
        const scoreZero = computeCompatibilityScoreDeterministic({
            overlaySourceId: 'C',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1,
        });

        expect(scoreZero).toBe(0);
    });
});
