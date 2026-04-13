import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Multi-Overlay Stack Order', () => {
    test('handlers execute in deterministic stack order', () => {
        const executionOrder: number[] = [];
        const runState = { telemetry: [], seamHashFingerprints: [] };

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
                            wrapHandler((core: any) => { executionOrder.push(0); return { ...core, ext1: 'first' }; }),
                            wrapHandler((core: any) => { executionOrder.push(1); return { ...core, ext2: 'second' }; })
                        ]
                    }
                },
                runState
            }
        );

        // Handlers execute in array order (deterministic)
        expect(executionOrder).toEqual([0, 1]);
        // Both handlers' contributions are present (second receives first's output)
        expect(result.coreField).toBe('original');
        expect(result.ext1).toBe('first');
        expect(result.ext2).toBe('second');
        // Two telemetry records (one per handler)
        expect(runState.telemetry.length).toBe(2);
    });

    test('single-handler stack behaves identically to legacy model', () => {
        const runState = { telemetry: [], seamHashFingerprints: [] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [wrapHandler((core: any) => ({ ...core, extField: 'injected' }))]
                    }
                },
                runState
            }
        );

        expect(result.extField).toBe('injected');
        expect(runState.telemetry.length).toBe(1);
        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
    });
});
