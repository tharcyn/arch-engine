import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Signature Telemetry Capture (F-3)', () => {

    test('telemetry captures verified signature metadata on EXECUTED handler', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'ok' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
        expect(runState.telemetry[0].signaturePresent).toBe(true);
        expect(runState.telemetry[0].signatureValid).toBe(true);
        expect(runState.telemetry[0].signatureVerificationMode).toBe('verified');
    });

    test('telemetry captures missing signature metadata on REJECTED handler', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            { // No signature
                                overlaySourceId: 'unsigned',
                overlayRegistrySource: 'core',
                                overlayVersion: '1.0.0',
                                handler: (core: any) => ({ ...core, ext: 'bad' })
                            }
                        ]
                    }
                },
                runState
            }
        );

        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[0].signaturePresent).toBe(false);
        expect(runState.telemetry[0].signatureValid).toBe(false);
        expect(runState.telemetry[0].signatureVerificationMode).toBe('missing');
    });

    test('telemetry captures bypass mode for TRUSTED_POLICY_PACK', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        executeOverlaySeam(
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
                            wrapHandler(() => ({ result: 'replaced' }), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                },
                runState
            }
        );

        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
        expect(runState.telemetry[0].signatureVerificationMode).toBe('verified');
        expect(runState.telemetry[0].signatureValid).toBe(true);
    });

    test('signature telemetry fields do NOT influence fingerprint identity', () => {
        const runState1 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        const runState2 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Two handlers with same identity but different signatures
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [{
                            overlaySourceId: 'same-source',
                overlayRegistrySource: 'core',
                            overlayVersion: '1.0.0',
                            overlaySignature: 'sig:alpha',
                            handler: (core: any) => ({ ...core, ext: 'v1' })
                        }]
                    }
                },
                runState: runState1
            }
        );

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [{
                            overlaySourceId: 'same-source',
                overlayRegistrySource: 'core',
                            overlayVersion: '1.0.0',
                            overlaySignature: 'sig:beta',
                            handler: (core: any) => ({ ...core, ext: 'v1' })
                        }]
                    }
                },
                runState: runState2
            }
        );

        // Fingerprints MUST be identical — signature does not participate
        expect(runState1.seamHashFingerprints[0]).toBe(runState2.seamHashFingerprints[0]);
    });
});
