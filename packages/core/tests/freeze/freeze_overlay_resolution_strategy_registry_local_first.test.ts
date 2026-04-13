import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Registry Local First)', () => {
    test('Overlays are sorted strictly preferring execution registry matches', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            executionRegistryId: 'partner',
            candidateOverlays: [
                { overlaySourceId: 'remote-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2 },
                { overlaySourceId: 'local-auth',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 1 }
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.REGISTRY_LOCAL_FIRST);
        expect(resolved[0].overlaySourceId).toBe('local-auth'); // Despite lower authority, it is local to execution request
        expect(resolved[1].overlaySourceId).toBe('remote-auth');
    });
});
