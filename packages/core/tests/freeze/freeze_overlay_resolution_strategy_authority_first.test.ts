import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Authority First)', () => {
    test('Overlays are sorted strictly by authority tier descending', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            candidateOverlays: [
                { overlaySourceId: 'low-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 1 },
                { overlaySourceId: 'high-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.AUTHORITY_FIRST);
        expect(resolved[0].overlaySourceId).toBe('high-auth');
        expect(resolved[1].overlaySourceId).toBe('low-auth');
    });

    test('Falls back to registry trust domain then version if authority is identical', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            candidateOverlays: [
                { overlaySourceId: 'same-auth-v1',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1 },
                { overlaySourceId: 'same-auth-v2',
                overlayRegistrySource: 'core', overlayVersion: '2.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, registryTrustDomain: 1 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.AUTHORITY_FIRST);
        expect(resolved[0].overlaySourceId).toBe('same-auth-v2');
    });
});
