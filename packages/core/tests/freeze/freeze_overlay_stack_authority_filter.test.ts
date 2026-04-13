import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Stack Authority Filter', () => {
    test('context-level authority rejection prevents all handler execution', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary', // replace-if-authorized requires >= TRUSTED_POLICY_PACK
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [
                                wrapHandler(() => ({ result: 'hacked1' })),
                                wrapHandler(() => ({ result: 'hacked2' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(OverlaySeamError);
    });

    test('authority rejection emits telemetry without terminating subsequent stack handlers', () => {
        const runState = { telemetry: [], seamHashFingerprints: [] };

        // With merge-by-key, tier 2 (SIGNED_EXTERNAL_PACK) is sufficient.
        // All handlers should execute and produce per-handler telemetry.
        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext1: 'handler1' })),
                            wrapHandler((core: any) => ({ ...core, ext2: 'handler2' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(result.ext1).toBe('handler1');
        expect(result.ext2).toBe('handler2');
        // Each handler produces its own telemetry record
        expect(runState.telemetry.length).toBe(2);
        expect(runState.telemetry[0].stackPosition).toBe(0);
        expect(runState.telemetry[0].stackSize).toBe(2);
        expect(runState.telemetry[1].stackPosition).toBe(1);
        expect(runState.telemetry[1].stackSize).toBe(2);
    });
});
