import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler, createTestSignatureEnvelope } from './utils/wrapHandler.js';
import { computeSnapshotClosureGraphHash } from '../../src/transport/snapshotClosureGraphHash.js';

describe('Freeze Evidence: Overlay Stack Deterministic Sorting', () => {
    test('fingerprint ordering deterministic across replay', () => {
        const runState1 = { telemetry: [], seamHashFingerprints: [] };
        const runState2 = { telemetry: [], seamHashFingerprints: [] };

        const handlers = [
            wrapHandler((core: any) => ({ ...core, ext1: 'a' })),
            wrapHandler((core: any) => ({ ...core, ext2: 'b' }))
        ];

        // Execute twice with identical handler stacks
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': handlers
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
                    activeOverlays: ['pack1', 'pack2'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': handlers
                    }
                },
                runState: runState2
            }
        );

        // Fingerprint count matches handler count
        console.log(JSON.stringify(runState1.telemetry, null, 2));
        expect(runState1.seamHashFingerprints.length).toBe(2);
        expect(runState2.seamHashFingerprints.length).toBe(2);

        // Fingerprints are identical across replay
        expect(runState1.seamHashFingerprints).toEqual(runState2.seamHashFingerprints);

        // Closure hash is deterministic
        const dummyEntries: any[] = [{
            policyId: 'dummy',
            policyNamespace: 'core',
            config: { version: '1.0.0' },
            executionMetadata: { capabilityClosureHash: 'aaa' }
        }];

        const hash1 = computeSnapshotClosureGraphHash(dummyEntries, runState1.seamHashFingerprints);
        const hash2 = computeSnapshotClosureGraphHash(dummyEntries, runState2.seamHashFingerprints);
        expect(hash1).toBe(hash2);
    });

    test('empty handler stack produces zero fingerprints', () => {
        const runState = { telemetry: [], seamHashFingerprints: [] };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [] // Empty handler stack
                    }
                },
                runState
            }
        );

        // No handlers = no fingerprints, telemetry records BYPASSED
        expect(runState.seamHashFingerprints.length).toBe(0);
        expect(runState.telemetry.length).toBe(1);
        expect(runState.telemetry[0].activationDecision).toBe('BYPASSED');
    });
});
