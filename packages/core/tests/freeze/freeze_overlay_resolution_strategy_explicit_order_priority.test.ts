import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: EXPLICIT_ORDER_ONLY overrides Lexical Fallback', () => {
    test('explicit order strictly ignores native lexical precedence natively', () => {
        const candidates = [
            { overlaySourceId: 'apple',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' },
            { overlaySourceId: 'zebra',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' }
        ];

        // Apple is lexically first natively.
        // But if ExplicitOrderOnly specifies zebra first:
        const resolved = resolveOverlaySelection({
            seamId: 'test',
            candidateOverlays: candidates,
            optionalExplicitOrderingList: ['zebra', 'apple']
        }, ResolutionStrategy.EXPLICIT_ORDER_ONLY);

        expect(resolved[0].overlaySourceId).toBe('zebra');
        expect(resolved[1].overlaySourceId).toBe('apple');
    });
});
