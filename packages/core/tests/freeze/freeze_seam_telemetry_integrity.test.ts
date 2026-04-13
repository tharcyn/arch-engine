import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Seam Telemetry Integrity', () => {
    test('telemetry strictly collected safely and independently', () => {
        const runState = {
            telemetry: [],
            seamHashFingerprints: []
        };
        
        executeOverlaySeam(
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

        // Core execution happened and telemetry collected safely
        expect(runState.telemetry.length).toBe(1);
        const record = runState.telemetry[0];
        expect(record.seamId).toBe('overlay::manifest::mergeBoundary');
        expect(record.mergeMode).toBe('merge-by-key');
        expect(record.activationDecision).toBe('EXECUTED');
        expect(record.authorityTier).toBe(OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
        
        // Ensure failure tolerance doesn't blow up pipeline
        // (Just assuring typing and object schema works correctly natively without mutating bounds).
    });

    test('telemetry completely escapes safely without runState', () => {
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
                }
                // No runState provided!
            }
        );

        expect(result.extField).toBe('injected');
        // If it throws, this test fails. It must succeed silently.
    });
});
