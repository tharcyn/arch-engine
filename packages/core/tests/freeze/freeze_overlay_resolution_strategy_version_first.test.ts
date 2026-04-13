import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Version First)', () => {
    test('Overlays are sorted strictly by semantic version descending, ignoring authority', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            candidateOverlays: [
                { overlaySourceId: 'high-auth-v1',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 },
                { overlaySourceId: 'low-auth-v2',
                overlayRegistrySource: 'core', overlayVersion: '2.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 1 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.VERSION_FIRST);
        expect(resolved[0].overlaySourceId).toBe('low-auth-v2');
        expect(resolved[1].overlaySourceId).toBe('high-auth-v1');
    });
});
