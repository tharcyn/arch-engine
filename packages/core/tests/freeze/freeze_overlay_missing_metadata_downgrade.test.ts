import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Metadata Downgrade Prevention', () => {
    test('missing trust metadata gracefully defaults to lowest tier and fails replace-if-authorized', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                        // missing overlayTrustTier entirely
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [wrapHandler(() => ({ result: 'hacked' }))]
                        }
                    }
                }
            );
        }).toThrowError(OverlaySeamError);
        
        try {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [wrapHandler(() => ({ result: 'hacked' }))]
                        }
                    }
                }
            );
        } catch(e: any) {
            expect(e.code).toBe(SeamConflictCode.SEAM_UNAUTHORIZED_OVERRIDE);
            expect(e.message).toContain('Insufficient trust tier'); 
        }
    });

    test('missing trust metadata defaults to lowest tier and allows append mode', () => {
        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary',
            () => ([1, 2, 3]),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',seamOverrides: {
                        'overlay::dependency::closureBoundary': [wrapHandler((core: any) => ([...core, 4]))]
                    }
                }
            }
        );
        expect(result.length).toBe(4);
    });
});
