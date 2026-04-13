import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Invalid Signature Rejection (F-3)', () => {

    test('handler with invalid signature format is rejected', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            {
                                overlaySourceId: 'invalid-sig-handler',
                overlayRegistrySource: 'core',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sha256:not-a-valid-sig', // Invalid format
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
        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[0].signaturePresent).toBe(true);
        expect(runState.telemetry[0].signatureValid).toBe(false);
        expect(runState.telemetry[0].signatureVerificationMode).toBe('invalid');
    });

    test('context-level invalid signature rejects before handler evaluation', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'invalid-signature-data',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                {
                                    overlaySourceId: 'test',
                overlayRegistrySource: 'core',
                                    overlayVersion: '1.0.0',
                                    overlaySignature: 'sig:good-handler-sig',
                                    handler: (core: any) => ({ ...core, ext: 'should-not-run' })
                                }
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Signature invalid for signed-tier claim/);
    });

    test('rejection due to invalid signature does not abort other handlers in stack', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            {
                                overlaySourceId: 'bad-handler',
                overlayRegistrySource: 'core',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sha256:invalid', // Invalid
                                handler: (core: any) => ({ ...core, bad: true })
                            },
                            {
                                overlaySourceId: 'good-handler',
                overlayRegistrySource: 'core',
                                overlayVersion: '1.0.0',
                                overlaySignature: 'sig:good-handler', // Valid
                                handler: (core: any) => ({ ...core, good: true })
                            }
                        ]
                    }
                },
                runState
            }
        );

        // Bad handler rejected, good handler executed
        expect(result.bad).toBeUndefined();
        expect(result.good).toBe(true);
        expect(runState.telemetry.length).toBe(2);
        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[1].activationDecision).toBe('EXECUTED');
    });
});
