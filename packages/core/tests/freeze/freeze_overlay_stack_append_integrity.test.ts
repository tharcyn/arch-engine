import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Stack Append Integrity', () => {
    test('multi-handler append preserves referential integrity across handlers', () => {
        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary',
            () => ([1, 2, 3]),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        allowPrecedenceOverrides: true,
                    seamOverrides: {
                        'overlay::dependency::closureBoundary': [
                            wrapHandler((core: any) => ([...core, 4]), { overlaySignature: 'sig:context-default' }),
                            wrapHandler((core: any) => ([...core, 5]), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                }
            }
        );

        // Both appends are present
        expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('multi-handler append rejects element mutation at any handler', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::dependency::closureBoundary',
                () => ([1, 2, 3]),
                {
                    activation: {
                        activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::dependency::closureBoundary': [
                                wrapHandler((core: any) => ([...core, 4]), { overlaySignature: 'sig:context-default' }),       // Valid: appends
                                wrapHandler((core: any) => ([999, ...core.slice(1)]), { overlaySignature: 'sig:context-default' }) // Invalid: mutates index 0
                            ]
                        }
                    }
                }
            );
        }).toThrowError(OverlaySeamError);
    });
});
