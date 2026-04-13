import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Cross-Registry Stability (F-4)', () => {

    test('same handlers sorted identically regardless of insertion order', () => {
        const a: OverlayHandlerMetadata = {
            overlaySourceId: 'vendor-alpha',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0',
            overlayNamespace: 'governance', overlayRegistrySource: 'official',
            overlayPriority: 5, overlayDeclaredOrder: 1,
            handler: () => 'alpha'
        };
        const b: OverlayHandlerMetadata = {
            overlaySourceId: 'vendor-beta',
                overlayRegistrySource: 'core', overlayVersion: '2.0.0',
            overlayNamespace: 'compliance', overlayRegistrySource: 'partner',
overlaySignature: 'sig:context-default',
overlayPriority: 1, overlayDeclaredOrder: 0,
            handler: () => 'beta'
        };
        const c: OverlayHandlerMetadata = {
            overlaySourceId: 'vendor-gamma',
                overlayRegistrySource: 'core', overlayVersion: '0.5.0',
            overlayNamespace: 'identity', overlayRegistrySource: 'partner',
overlaySignature: 'sig:context-default',
overlayPriority: 3, overlayDeclaredOrder: 2,
            handler: () => 'gamma'
        };

        // All 6 permutations must produce identical output
        const permutations = [
            [a, b, c], [a, c, b], [b, a, c],
            [b, c, a], [c, a, b], [c, b, a]
        ];

        const referenceOrder = sortOverlayHandlerStackByPrecedence(permutations[0])
            .map(h => h.overlaySourceId);

        for (let i = 1; i < permutations.length; i++) {
            const order = sortOverlayHandlerStackByPrecedence(permutations[i])
                .map(h => h.overlaySourceId);
            expect(order).toEqual(referenceOrder);
        }
    });

    test('sorting is independent of mirror source identity', () => {
        // Same handlers resolved from different registries must sort identically
        const fromPrimary: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'pack-b',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayRegistrySource: 'official', handler: (x: any) => x },
            { overlaySourceId: 'pack-a',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayRegistrySource: 'official', handler: (x: any) => x }
        ];
        const fromMirror: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'pack-a',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayRegistrySource: 'official', handler: (x: any) => x },
            { overlaySourceId: 'pack-b',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayRegistrySource: 'official', handler: (x: any) => x }
        ];

        const sortedPrimary = sortOverlayHandlerStackByPrecedence(fromPrimary).map(h => h.overlaySourceId);
        const sortedMirror = sortOverlayHandlerStackByPrecedence(fromMirror).map(h => h.overlaySourceId);
        expect(sortedPrimary).toEqual(sortedMirror);
    });

    test('sorting does not use Date, random, or array index', () => {
        const handlers: OverlayHandlerMetadata[] = [];
        for (let i = 0; i < 20; i++) {
            handlers.push({
                overlaySourceId: `handler-${String(i).padStart(2, '0')}`,
                overlayVersion: '1.0.0',
                handler: (x: any) => x
            });
        }

        // Shuffle and sort 10 times — all must produce identical result
        const referenceOrder = sortOverlayHandlerStackByPrecedence(handlers).map(h => h.overlaySourceId);

        for (let trial = 0; trial < 10; trial++) {
            const shuffled = [...handlers].sort(() => Math.random() - 0.5);
            const sorted = sortOverlayHandlerStackByPrecedence(shuffled).map(h => h.overlaySourceId);
            expect(sorted).toEqual(referenceOrder);
        }
    });
});
