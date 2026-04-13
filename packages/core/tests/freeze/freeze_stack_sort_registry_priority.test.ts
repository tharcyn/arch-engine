import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence, computeHandlerSortKey } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayAuthorityTier, OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Stack Sort Registry Priority (F-4)', () => {

    test('registry priority weight mapping is correct', () => {
        const handler = (source: string): OverlayHandlerMetadata => ({
            overlaySourceId: 'test', overlayVersion: '1.0.0',
            overlayRegistrySource: source, handler: (x: any) => x
        });

        expect(computeHandlerSortKey(handler('core'))[1]).toBe(400);
        expect(computeHandlerSortKey(handler('official'))[1]).toBe(300);
        expect(computeHandlerSortKey(handler('partner'))[1]).toBe(200);
        expect(computeHandlerSortKey(handler('external'))[1]).toBe(100);
    });

    test('unknown registry source gets default weight 50', () => {
        const handler: OverlayHandlerMetadata = {
            overlaySourceId: 'test', overlayVersion: '1.0.0',
            overlayRegistrySource: 'custom-mirror',
            handler: (x: any) => x
        };

        expect(computeHandlerSortKey(handler)[1]).toBe(50);
    });

    test('missing registry source gets default weight 50', () => {
        const handler: OverlayHandlerMetadata = {
            overlaySourceId: 'test', overlayVersion: '1.0.0',
            handler: (x: any) => x
        };

        expect(computeHandlerSortKey(handler)[1]).toBe(50);
    });

    test('handlers sort by registry priority (external before core)', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'test', overlayVersion: '1.0.0', overlayRegistrySource: 'partner', handler: (x: any) => x },
            { overlaySourceId: 'test', overlayVersion: '1.0.0', overlayRegistrySource: 'external', handler: (x: any) => x },
            { overlaySourceId: 'test', overlayVersion: '1.0.0', overlayRegistrySource: 'core', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlayRegistrySource).toBe('external');
        expect(sorted[1].overlayRegistrySource).toBe('partner');
        expect(sorted[2].overlayRegistrySource).toBe('core');
    });
});
