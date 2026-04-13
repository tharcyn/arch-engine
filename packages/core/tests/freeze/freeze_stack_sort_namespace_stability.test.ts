import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Namespace Stability (F-4)', () => {

    test('handlers sort by namespace lexicographically', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'zeta', handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'alpha', handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'mu', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayNamespace).toBe('alpha');
        expect(sorted[1].overlayNamespace).toBe('mu');
        expect(sorted[2].overlayNamespace).toBe('zeta');
    });

    test('missing namespace defaults to empty string (sorts first)', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'alpha', handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        // Empty string sorts before 'alpha'
        expect(sorted[0].overlayNamespace).toBeUndefined();
        expect(sorted[1].overlayNamespace).toBe('alpha');
    });

    test('namespace ordering is deterministic across permutations', () => {
        const a: OverlayHandlerMetadata = { overlaySourceId: 'a',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'governance', handler: (x: any) => x };
        const b: OverlayHandlerMetadata = { overlaySourceId: 'b',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'identity', handler: (x: any) => x };
        const c: OverlayHandlerMetadata = { overlaySourceId: 'c',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayNamespace: 'compliance', handler: (x: any) => x };

        const order1 = sortOverlayHandlerStackByPrecedence([a, b, c]);
        const order2 = sortOverlayHandlerStackByPrecedence([c, a, b]);
        const order3 = sortOverlayHandlerStackByPrecedence([b, c, a]);

        const ids1 = order1.map(h => h.overlaySourceId);
        const ids2 = order2.map(h => h.overlaySourceId);
        const ids3 = order3.map(h => h.overlaySourceId);

        expect(ids1).toEqual(ids2);
        expect(ids2).toEqual(ids3);
    });
});
