import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy, OverlayResolutionFailureError } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: Elimination Trace Ordering Determinism', () => {
    test('same analytical failure trace regardless of delivery order', () => {
        const createCandidates = () => [
            { overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' },
            { overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' }
        ];

        let traceA: any[] = [];
        let traceB: any[] = [];

        try {
            resolveOverlaySelection({
                seamId: 'test',
                candidateOverlays: createCandidates(),
                optionalPinnedOverlaySet: ['test-Z']
            }, ResolutionStrategy.PINNED_ONLY);
        } catch (e: any) {
            traceA = e.eliminationSteps.map((s: any) => s.overlayId);
        }

        try {
            // Provide candidates in reversed delivery order to simulate async registry responses
            resolveOverlaySelection({
                seamId: 'test',
                candidateOverlays: createCandidates().reverse(), 
                optionalPinnedOverlaySet: ['test-Z']
            }, ResolutionStrategy.PINNED_ONLY);
        } catch (e: any) {
            traceB = e.eliminationSteps.map((s: any) => s.overlayId);
        }

        // Evaluation is strictly deterministic based on the underlying TieBreak.
        // test-A alphabetically precedes test-B.
        expect(traceA).toEqual(['test-A', 'test-B']);
        expect(traceB).toEqual(['test-A', 'test-B']); 
    });
});
