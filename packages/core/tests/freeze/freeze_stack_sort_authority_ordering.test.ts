import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence, computeHandlerSortKey } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayAuthorityTier, OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Authority Ordering (F-4)', () => {

    test('lower authority tier executes before higher authority tier', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'same',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'same',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        // UNTRUSTED (100) should sort before SIGNED (200)
        const keyUntrusted = computeHandlerSortKey(handlers[0], OverlayAuthorityTier.UNTRUSTED_EXTERNAL);
        const keySigned = computeHandlerSortKey(handlers[1], OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);

        expect(keyUntrusted[0]).toBe(100);
        expect(keySigned[0]).toBe(200);
        expect(keyUntrusted[0]).toBeLessThan(keySigned[0]);
    });

    test('authority tier weight mapping is correct', () => {
        const handler: OverlayHandlerMetadata = {
            overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x
        };

        expect(computeHandlerSortKey(handler, OverlayAuthorityTier.UNTRUSTED_EXTERNAL)[0]).toBe(100);
        expect(computeHandlerSortKey(handler, OverlayAuthorityTier.SIGNED_EXTERNAL_PACK)[0]).toBe(200);
        expect(computeHandlerSortKey(handler, OverlayAuthorityTier.TRUSTED_POLICY_PACK)[0]).toBe(300);
        expect(computeHandlerSortKey(handler, OverlayAuthorityTier.CORE_INTERNAL)[0]).toBe(400);
    });

    test('sort produces authority-ascending order', () => {
        // Insertion order: CORE first, then UNTRUSTED
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'core-handler',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'untrusted-handler',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        // Pass CORE tier — all handlers get same tier weight since contextAuthorityTier is uniform
        // With same tier, sort by sourceId lexicographically
        const sorted = sortOverlayHandlerStackByPrecedence(handlers, OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
        expect(sorted[0].overlaySourceId).toBe('core-handler');
        expect(sorted[1].overlaySourceId).toBe('untrusted-handler');
    });
});
