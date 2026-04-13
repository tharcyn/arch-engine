import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionContext } from '../../src/topology/overlayResolutionPolicy.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-11 Overlay Resolution Strategy (Compatibility Maximal)', () => {
    test('Overlays are sorted strictly by maximum compatibility surface intersection', () => {
        const context: OverlayResolutionContext = {
            seamId: 'test.seam',
            candidateOverlays: [
                { overlaySourceId: 'comp-low',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'partner', authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, registryTrustDomain: 1, compatibilityRecord: { requiresCapabilities: ['a'], incompatibleWith: ['b'] } }, // Score: 1 - 1 = 0
                { overlaySourceId: 'comp-high',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', registryId: 'core', authorityTier: OverlayAuthorityTier.CORE_INTERNAL, registryTrustDomain: 2, compatibilityRecord: { compatibleWithCoreVersions: ['1.0', '2.0'], requiresCapabilities: ['a', 'c'] } } // Score: 2 + 2 = 4
            ]
        };

        const resolved = resolveOverlaySelection(context, ResolutionStrategy.COMPATIBILITY_MAXIMAL);
        expect(resolved[0].overlaySourceId).toBe('comp-high');
        expect(resolved[1].overlaySourceId).toBe('comp-low');
    });
});
