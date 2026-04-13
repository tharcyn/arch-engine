import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Signed Tier Requires Signature (F-3)', () => {

    test('SIGNED_EXTERNAL_PACK without signature is rejected at context gate', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'injected' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Signature missing for signed-tier claim/);
    });

    test('SIGNED_EXTERNAL_PACK with valid signature passes context gate', () => {
        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'ok' }))
                        ]
                    }
                }
            }
        );

        expect(result.ext).toBe('ok');
    });

    test('SIGNED_EXTERNAL_PACK handler without its own signature is rejected at handler gate', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            { // Handler WITHOUT signature
                                overlaySourceId: 'unsigned-handler',
                                overlayVersion: '1.0.0',
                                handler: (core: any) => ({ ...core, ext: 'should-not-execute' })
                            }
                        ]
                    }
                },
                runState
            }
        );

        // Handler is rejected — result is pure core
        expect(result.ext).toBeUndefined();
        expect(result.coreField).toBe('data');
        // Telemetry records rejection
        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[0].signaturePresent).toBe(false);
        expect(runState.telemetry[0].signatureVerificationMode).toBe('missing');
    });
});
