import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Priority Override (F-4)', () => {

    test('higher overlayPriority executes later', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: 10, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: 1, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: 5, handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayPriority).toBe(1);
        expect(sorted[1].overlayPriority).toBe(5);
        expect(sorted[2].overlayPriority).toBe(10);
    });

    test('default priority is 0', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: 5, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x } // default 0
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        // Default (0) sorts before explicit 5
        expect(sorted[0].overlayPriority).toBeUndefined();
        expect(sorted[1].overlayPriority).toBe(5);
    });

    test('negative priority sorts before zero', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: 0, handler: (x: any) => x },
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', overlayPriority: -10, handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayPriority).toBe(-10);
        expect(sorted[1].overlayPriority).toBe(0);
    });
});
