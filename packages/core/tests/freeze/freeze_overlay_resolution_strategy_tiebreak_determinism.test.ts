import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Tiebreak Determinism)', () => {
    test('Identical higher-order constraints correctly fall back to namespace, then overlayId', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            candidateOverlays: [
                { overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1, namespace: 'core.b' },
                { overlaySourceId: 'test-C',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1, namespace: 'core.b' }, // Same namespace, differ in ID
                { overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1, namespace: 'core.a' }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.AUTHORITY_FIRST);
        
        // Expected order:
        // By namespace asc: core.a -> test-A
        // By namespace core.b -> differ in ID -> test-B -> test-C
        expect(resolved[0].overlaySourceId).toBe('test-A');
        expect(resolved[1].overlaySourceId).toBe('test-B');
        expect(resolved[2].overlaySourceId).toBe('test-C');
    });
});
