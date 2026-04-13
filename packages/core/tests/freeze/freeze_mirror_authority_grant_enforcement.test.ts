import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Mirror Authority Grant Enforcement (F-5)', () => {

    test('mirrorBoundary seam requires replace-if-authorized (tier >= 3)', () => {
        // mirrorBoundary uses replace-if-authorized which requires TRUSTED_POLICY_PACK (3)
        // SIGNED_EXTERNAL_PACK (2) is insufficient
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::mirrorBoundary',
                () => ({ result: 'original' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySourceId: 'test-src',
                        overlayVersion: '1.0.0',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::transport::mirrorBoundary': [{
                                overlaySourceId: 'mirror-handler',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sig:mirror-handler-sig',
                                handler: () => ({ result: 'hijacked' })
                            }]
                        }
                    }
                }
            );
        }).toThrowError(/Insufficient trust tier|Registry admission policy violation/);
    });

    test('mirrorBoundary seam succeeds with TRUSTED_POLICY_PACK', () => {
        const result = executeOverlaySeam(
            'overlay::transport::mirrorBoundary',
            () => ({ result: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                    overlayRegistrySource: 'core',
                    overlaySourceId: 'test-src',
                    overlayVersion: '1.0.0',
                    overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    seamOverrides: {
                        'overlay::transport::mirrorBoundary': [{
                            overlaySourceId: 'trusted-handler',
                            overlayVersion: '1.0.0',
                            overlaySignature: 'sig:context-default',
handler: () => ({ result: 'routed' })
                        }]
                    }
                }
            }
        );

        expect(result.result).toBe('routed');
    });

    test('mirrorBoundary with authority grants: no grant = context-level rejection', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::mirrorBoundary',
                () => ({ result: 'original' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySourceId: 'test-src',
                        overlayVersion: '1.0.0',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        authorityGrants: {
                            // Grant for a different seam - NOT mirrorBoundary
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                                allowedMergeModes: ['merge-by-key']
                            }
                        },
                        seamOverrides: {
                            'overlay::transport::mirrorBoundary': [{
                                overlaySourceId: 'handler',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sig:context-default',
handler: () => ({ result: 'should-not-run' })
                            }]
                        }
                    }
                }
            );
        }).toThrowError(); // Rejected — no grant for mirror seam
    });
});
