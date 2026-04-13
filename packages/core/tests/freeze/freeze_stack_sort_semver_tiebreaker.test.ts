import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Semver Tiebreaker (F-4)', () => {

    test('handlers sort by overlaySourceId lexicographically as tiebreaker', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'z-vendor',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'a-vendor',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'm-vendor',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlaySourceId).toBe('a-vendor');
        expect(sorted[1].overlaySourceId).toBe('m-vendor');
        expect(sorted[2].overlaySourceId).toBe('z-vendor');
    });

    test('handlers sort by overlayVersion as final tiebreaker', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'vendor',
                overlayRegistrySource: 'core', overlayVersion: '2.0.0', handler: (x: any) => x },
            { overlaySourceId: 'vendor',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'vendor',
                overlayRegistrySource: 'core', overlayVersion: '1.5.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayVersion).toBe('1.0.0');
        expect(sorted[1].overlayVersion).toBe('1.5.0');
        expect(sorted[2].overlayVersion).toBe('2.0.0');
    });

    test('combined sourceId and version tiebreaker', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'beta',
                overlayRegistrySource: 'core', overlayVersion: '2.0.0', handler: (x: any) => x },
            { overlaySourceId: 'alpha',
                overlayRegistrySource: 'core', overlayVersion: '3.0.0', handler: (x: any) => x },
            { overlaySourceId: 'alpha',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        // alpha sorts before beta (sourceId first)
        expect(sorted[0].overlaySourceId).toBe('alpha');
        expect(sorted[0].overlayVersion).toBe('1.0.0');
        expect(sorted[1].overlaySourceId).toBe('alpha');
        expect(sorted[1].overlayVersion).toBe('3.0.0');
        expect(sorted[2].overlaySourceId).toBe('beta');
    });
});
