import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Explicit Order Only)', () => {
    test('Overlays strictly follow the configured array precedence, rejecting missing elements', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            optionalExplicitOrderingList: ['middle-auth', 'high-auth'],
            candidateOverlays: [
                { overlaySourceId: 'high-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 },
                { overlaySourceId: 'middle-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1 },
                { overlaySourceId: 'low-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'external', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 0 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.EXPLICIT_ORDER_ONLY);
        expect(resolved.length).toBe(2);
        expect(resolved[0].overlaySourceId).toBe('middle-auth');
        expect(resolved[1].overlaySourceId).toBe('high-auth');
    });
});
