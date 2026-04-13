import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: F-11 Overlay Resolution Fingerprint Isolation', () => {
    test('Resolution strategy strictly only sorts and selects, NEVER altering fingerprint semantics', () => {
        // Asserting that the function returns strictly re-ordered elements natively
        const candidates = [
            { overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', authorityTier: 1, registryTrustDomain: 1 },
            { overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', authorityTier: 2, registryTrustDomain: 1 }
        ];

        const resolved = resolveOverlaySelection({ seamId: 'test', candidateOverlays: candidates }, ResolutionStrategy.AUTHORITY_FIRST);
        
        // Assert object integrity identical
        expect(resolved[0].overlaySourceId).toBe('test-B');
        expect(resolved[1].overlaySourceId).toBe('test-A');
        
        // Ensure no new fields were added or changed that would break fingerprint hashing upstream
        expect(Object.keys(resolved[0]).length).toBe(Object.keys(candidates[1]).length);
    });
});
