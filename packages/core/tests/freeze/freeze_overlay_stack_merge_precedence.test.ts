import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { OverlaySeamError } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Stack Merge Precedence', () => {
    test('merge-by-key handlers chain — second receives first output', () => {
        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext1: 'first' })),
                            wrapHandler((core: any) => ({ ...core, ext2: 'second' }))
                        ]
                    }
                }
            }
        );

        // Core key preserved through all handlers
        expect(result.coreField).toBe('original');
        // Both handler contributions present
        expect(result.ext1).toBe('first');
        expect(result.ext2).toBe('second');
    });

    test('merge-by-key handler deleting core key throws at any handler position', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ keepMe: true, otherKey: false }),
                {
                    activation: {
                        activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext1: 'ok' })),  // Valid
                                wrapHandler(() => ({ otherKey: true, ext1: 'ok' }))     // Deletes keepMe
                            ]
                        }
                    }
                }
            );
        }).toThrowError(OverlaySeamError);
    });
});
