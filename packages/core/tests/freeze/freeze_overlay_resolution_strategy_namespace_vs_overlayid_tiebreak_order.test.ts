import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: Namespace vs OverlayId Tiebreak Order', () => {
    test('Namespace fallback natively precedes OverlayId fallback sequentially', () => {
        const candidates = [
            { overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core.b' },
            { overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core.c' },
            { overlaySourceId: 'test-Z',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core.a' }
        ];

        const resolved = resolveOverlaySelection({ seamId: 'seam', candidateOverlays: candidates }, ResolutionStrategy.AUTHORITY_FIRST);
        
        // Even though overlayId Z is alphabetically last, its namespace 'core.a' makes it first.
        expect(resolved[0].overlaySourceId).toBe('test-Z');
        expect(resolved[1].overlaySourceId).toBe('test-B');
        expect(resolved[2].overlaySourceId).toBe('test-A');
    });
});
