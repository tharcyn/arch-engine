import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Declared Order (F-4)', () => {

    test('handlers sort by overlayDeclaredOrder within same precedence group', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 3, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 1, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 2, handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayDeclaredOrder).toBe(1);
        expect(sorted[1].overlayDeclaredOrder).toBe(2);
        expect(sorted[2].overlayDeclaredOrder).toBe(3);
    });

    test('default declared order is 0', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 2, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x } // default 0
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayDeclaredOrder).toBeUndefined();
        expect(sorted[1].overlayDeclaredOrder).toBe(2);
    });

    test('declared order breaks ties between same sourceId and version', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'pack-a',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 2, handler: () => 'second' },
            { overlaySourceId: 'pack-a',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayDeclaredOrder: 1, handler: () => 'first' }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].handler(null)).toBe('first');
        expect(sorted[1].handler(null)).toBe('second');
    });
});
