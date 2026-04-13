import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Authority Resolution', () => {
    test('replace-if-authorized rejected for insufficient tier', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        allowPrecedenceOverrides: true,
                        overlayRegistrySource: 'partner',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, // 2 is less than required 3
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
                        allowPrecedenceOverrides: true,
                        overlayRegistrySource: 'partner',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
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

    test('replace-if-authorized succeeds for sufficient tier', () => {
        const result = executeOverlaySeam(
            'overlay::registry::precedenceBoundary',
            () => ({ result: 'core' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    seamOverrides: {
                        'overlay::registry::precedenceBoundary': [
                            wrapHandler(() => ({ result: 'hacked' }), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                }
            }
        );
        expect(result.result).toBe('hacked');
    });
});
