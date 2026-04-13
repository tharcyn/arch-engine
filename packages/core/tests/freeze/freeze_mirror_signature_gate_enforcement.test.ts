import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';

describe('Freeze Evidence: Mirror Signature Gate Enforcement (F-5)', () => {

    test('mirrorBoundary handler without signature is rejected at SIGNED_EXTERNAL_PACK', () => {
        // Even though mirrorBoundary requires tier 3 for replace-if-authorized,
        // if an overlay claims SIGNED_EXTERNAL_PACK, signature gate runs first.

        // Test: context-level SIGNED_EXTERNAL_PACK without signature
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::mirrorBoundary',
                () => ({ result: 'original' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlaySourceId: 'mirror-handler',
                    overlayVersion: '1.0.0',
                    overlayRegistrySource: 'partner',
                    overlaySignature: undefined as unknown as string,
                    overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::transport::mirrorBoundary': [{
                                overlaySourceId: 'unsigned-mirror',
                                overlayVersion: '1.0.0',
                                handler: () => ({ result: 'should-not-run' })
                            }]
                        }
                    }
                }
            );
        }).toThrowError(/Signature missing/);
    });

    test('mirrorBoundary handler with invalid signature is rejected', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::mirrorBoundary',
                () => ({ result: 'original' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlaySourceId: 'mirror-handler',
                    overlayVersion: '1.0.0',
                    overlayRegistrySource: 'partner',
                    overlaySignature: undefined as unknown as string,
                    overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::transport::mirrorBoundary': [{
                                overlaySourceId: 'bad-sig-mirror',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sig:handler-sig',
                                handler: () => ({ result: 'should-not-run' })
                            }]
                        }
                    }
                }
            );
        }).toThrowError(/Signature invalid|Signature missing/);
    });

    test('mirrorBoundary with TRUSTED_POLICY_PACK WITHOUT signature is REJECTED (F-6 strict mode)', () => {
        setAllowLegacySignatures(false);
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        expect(() => {
            executeOverlaySeam(
                'overlay::transport::mirrorBoundary',
                (args) => ({ preResolved: false, ...args }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        seamOverrides: {
                            'overlay::transport::mirrorBoundary': [
                                {
                                    overlaySourceId: 'mirror-handler',
                                    overlayVersion: '1.0.0',
                                    // NO signature
                                    handler: (x) => ({ ...x, mirrorHit: true })
                                }
                            ]
                        }
                    },
                    runState
                }
            );
        }).toThrowError(/Signature missing for signed-tier claim|Registry admission policy/);
    });
});
