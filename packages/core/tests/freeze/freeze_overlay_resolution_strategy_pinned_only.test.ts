import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Pinned Only)', () => {
    test('Overlays absent from the pinned set are immediately rejected', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            optionalPinnedOverlaySet: ['local-auth'],
            candidateOverlays: [
                { overlaySourceId: 'remote-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 },
                { overlaySourceId: 'local-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 1 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.PINNED_ONLY);
        expect(resolved.length).toBe(1);
        expect(resolved[0].overlaySourceId).toBe('local-auth');
    });

    test('Throws if no candidates survive pinning constraints', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            optionalPinnedOverlaySet: ['some-other-overlay'],
            candidateOverlays: [
                { overlaySourceId: 'remote-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 }
            ]
        };

        expect(() => resolveOverlaySelection(context, ResolutionStrategy.PINNED_ONLY)).toThrow(/OverlayResolutionFailureError/);
    });
});
