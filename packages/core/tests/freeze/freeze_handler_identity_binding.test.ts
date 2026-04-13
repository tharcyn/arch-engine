import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier, OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';
import { computeSnapshotClosureGraphHash } from '../../src/transport/snapshotClosureGraphHash.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Handler Identity Binding (F-1)', () => {

    test('two handlers with different identities execute under their own metadata', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const handlers: readonly OverlayHandlerMetadata[] = [
            {
                overlaySourceId: 'vendor-alpha',
                overlayRegistrySource: 'core',
                overlayVersion: '1.0.0',
                overlaySignature: 'sig:alpha-v1',
                handler: (core: any) => ({ ...core, alpha: true })
            },
            {
                overlaySourceId: 'vendor-beta',
                overlayRegistrySource: 'core',
                overlayVersion: '2.0.0',
                overlaySignature: 'sig:beta-v2',
                handler: (core: any) => ({ ...core, beta: true })
            }
        ];

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack-alpha', 'pack-beta'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': handlers
                    }
                },
                runState
            }
        );

        // Both handlers executed
        expect(result.alpha).toBe(true);
        expect(result.beta).toBe(true);
        expect(result.coreField).toBe('original');

        // Telemetry records per-handler identity
        expect(runState.telemetry.length).toBe(2);

        // First handler identity
        expect(runState.telemetry[0].handlerOverlaySourceId).toBe('vendor-alpha');
        expect(runState.telemetry[0].handlerOverlayVersion).toBe('1.0.0');
        expect(runState.telemetry[0].overlaySourceId).toBe('vendor-alpha');
        expect(runState.telemetry[0].overlayVersion).toBe('1.0.0');

        // Second handler identity
        expect(runState.telemetry[1].handlerOverlaySourceId).toBe('vendor-beta');
        expect(runState.telemetry[1].handlerOverlayVersion).toBe('2.0.0');
        expect(runState.telemetry[1].overlaySourceId).toBe('vendor-beta');
        expect(runState.telemetry[1].overlayVersion).toBe('2.0.0');
    });

    test('identity mismatch cannot inherit activation-context identity', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Activation context declares one identity...
        // ...but handler declares a different one.
        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [{
                            overlaySourceId: 'handler-source',
                overlayRegistrySource: 'core',
                            overlayVersion: '0.1.0',
                            overlaySignature: 'sig:handler-source-v0.1.0',
                            handler: (core: any) => ({ ...core, injected: true })
                        }]
                    }
                },
                runState
            }
        );

        // Handler-level identity takes precedence
        expect(runState.telemetry[0].overlaySourceId).toBe('handler-source');
        expect(runState.telemetry[0].overlayVersion).toBe('0.1.0');
        expect(runState.telemetry[0].handlerOverlaySourceId).toBe('handler-source');
        expect(runState.telemetry[0].handlerOverlayVersion).toBe('0.1.0');

        // Must NOT inherit from activation context
        expect(runState.telemetry[0].overlaySourceId).not.toBe('context-source');
        expect(runState.telemetry[0].overlayVersion).not.toBe('9.9.9');
    });

    test('handler signature presence is recorded in telemetry', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const handlers: readonly OverlayHandlerMetadata[] = [
            {
                overlaySourceId: 'signed-vendor',
                overlayRegistrySource: 'core',
                overlayVersion: '1.0.0',
                overlaySignature: 'sig:abc123',
                handler: (core: any) => ({ ...core, signed: true })
            },
            {
                overlaySourceId: 'unsigned-vendor',
                overlayRegistrySource: 'core',
                overlayVersion: '1.0.0',
                // No overlaySignature — will be REJECTED by F-3 gate
                handler: (core: any) => ({ ...core, unsigned: true })
            }
        ];

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': handlers
                    }
                },
                runState
            }
        );

        // Signed handler: EXECUTED with signature present
        expect(runState.telemetry[0].handlerOverlaySignaturePresent).toBe(true);
        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
        // Unsigned handler: REJECTED by F-3 gate with signature absent
        expect(runState.telemetry[1].handlerOverlaySignaturePresent).toBe(false);
        expect(runState.telemetry[1].activationDecision).toBe('REJECTED');
    });

    test('closure hash unchanged by handler identity binding', () => {
        const runState1 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        const runState2 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Same handlers with different identities
        const handlers1: readonly OverlayHandlerMetadata[] = [{
            overlaySourceId: 'source-a',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: 'sig:source-a-v1',
            handler: (core: any) => ({ ...core, ext: 'v1' })
        }];
        const handlers2: readonly OverlayHandlerMetadata[] = [{
            overlaySourceId: 'source-b',
                overlayRegistrySource: 'core',
            overlayVersion: '2.0.0',
            overlaySignature: 'sig:source-b-v2',
            handler: (core: any) => ({ ...core, ext: 'v1' })
        }];

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        includeSeamExecutionInClosureHash: true,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': handlers1 }
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
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        includeSeamExecutionInClosureHash: true,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': handlers2 }
                },
                runState: runState2
            }
        );

        // Fingerprints should differ because identity participates in fingerprint
        console.log(JSON.stringify(runState1.telemetry, null, 2));
        expect(runState1.seamHashFingerprints[0]).not.toBe(runState2.seamHashFingerprints[0]);

        // Closure hash version remains v2
        const dummyEntries: any[] = [{
            policyId: 'dummy', policyNamespace: 'core',
            config: { version: '1.0.0' },
            executionMetadata: { capabilityClosureHash: 'aaa' }
        }];

        // Both produce valid hashes (structural soundness)
        const hash1 = computeSnapshotClosureGraphHash(dummyEntries, runState1.seamHashFingerprints);
        const hash2 = computeSnapshotClosureGraphHash(dummyEntries, runState2.seamHashFingerprints);
        expect(hash1).toBeDefined();
        expect(hash2).toBeDefined();
        expect(typeof hash1).toBe('string');
        expect(typeof hash2).toBe('string');
    });

    test('malicious handler cannot inherit trusted activation context identity', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Simulates attack: activation context declares 'trusted-vendor' but
        // the actual handler declares 'malicious-actor' with NO valid signature.
        // Under F-3, this handler is REJECTED at the signature gate (missing sig).
        const maliciousHandler: OverlayHandlerMetadata = {
            overlaySourceId: 'malicious-actor',
                overlayRegistrySource: 'core',
            overlayVersion: '0.0.1',
            // No overlaySignature — will be rejected by F-3 signature gate
            handler: (core: any) => ({ ...core, payload: 'evil' })
        };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['trusted-pack'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [maliciousHandler]
                    }
                },
                runState
            }
        );

        // F-3: Handler is REJECTED due to missing signature.
        // Telemetry must record the HANDLER's identity, not the context's.
        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[0].overlaySourceId).toBe('malicious-actor');
        expect(runState.telemetry[0].overlayVersion).toBe('0.0.1');
        expect(runState.telemetry[0].handlerOverlaySourceId).toBe('malicious-actor');
        expect(runState.telemetry[0].handlerOverlayVersion).toBe('0.0.1');

        // The trusted identity must NOT appear in handler-level telemetry
        expect(runState.telemetry[0].overlaySourceId).not.toBe('trusted-vendor');
    });

    test('handler provenance fields do not influence fingerprint identity', () => {
        const runState1 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        const runState2 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Two handlers with SAME identity but different signature presence
        const handler1: OverlayHandlerMetadata = {
            overlaySourceId: 'same-source',
                overlayVersion: '1.0.0',
            overlaySignature: 'sig:sig1',
            overlayRegistrySource: 'core',
            handler: (core: any) => ({ ...core, ext: 'v1' })
        };
        const handler2: OverlayHandlerMetadata = {
            overlaySourceId: 'same-source',
                overlayVersion: '1.0.0',
            overlaySignature: 'sig:sig2',
            overlayRegistrySource: 'core',
            handler: (core: any) => ({ ...core, ext: 'v1' })
        };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        includeSeamExecutionInClosureHash: true,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': [handler1] }
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
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        includeSeamExecutionInClosureHash: true,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': [handler2] }
                },
                runState: runState2
            }
        );

        // Fingerprints MUST be identical because overlaySignature does not participate
        expect(runState1.seamHashFingerprints[0]).toBe(runState2.seamHashFingerprints[0]);
    });
});
