import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Seam Conflict Avoidance', () => {
    test('freeze::overlay::topology::seamConflictBlocking', () => {
        
        const defaultAction = () => ({ hello: 'core' });

        // Reject unknown seams (must provide activation context to reach namespace validation)
        const unknownSeamContext = {
            activation: {
                activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: 1,
                        seamOverrides: {}
            }
        };
        
        expect(() => {
            executeOverlaySeam('overlay::invalid::unknownSeam' as any, defaultAction, unknownSeamContext);
        }).toThrowError(OverlaySeamError);

        // Throw exactly SEAM_NOT_FOUND
        try {
            executeOverlaySeam('overlay::invalid::unknownSeam' as any, defaultAction, unknownSeamContext);
        } catch (e: any) {
            expect(e.code).toBe(SeamConflictCode.SEAM_NOT_FOUND);
        }

        // Test replace-if-authorized rejected if unauthorized
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary', 
                defaultAction,
                {
                  activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: false,
                    overlayTrustTier: 4, // CORE_INTERNAL needed to breach tier logic, but it should still fail allowPrecedenceOverrides limit
                    seamOverrides: {
                        'overlay::registry::precedenceBoundary': [wrapHandler(() => ({ result: 'hacked' }))]
                    }
                  }
                }
            );
        }).toThrowError(OverlaySeamError);

        // Test array append enforcement
        expect(() => {
            executeOverlaySeam(
                'overlay::dependency::closureBoundary',
                () => ([1, 2, 3]),
                {
                  activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                    overlayTrustTier: 4, 
                    seamOverrides: {
                        'overlay::dependency::closureBoundary': [wrapHandler(() => ([1, 2]))] // Shortened array
                    }
                  }
                }
            );
        }).toThrowError(OverlaySeamError);
        
        // Test key deletion blocking in merge-by-key
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ keepMe: true, someOtherKey: false }),
                {
                  activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                    overlayTrustTier: 4,
                    seamOverrides: {
                        'overlay::manifest::mergeBoundary': [wrapHandler(() => ({ someOtherKey: true }))] // Deleted keepMe
                    }
                  }
                }
            );
        }).toThrowError(OverlaySeamError);
    });
});
