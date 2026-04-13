import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { OverlaySeamError } from '../../src/errors/seamErrors.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Seam Grant Absence Rejection (F-2)', () => {

    test('seam not in authorityGrants map is rejected even with global TRUSTED tier', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        authorityGrants: {
                            // Grant exists for a different seam, not the requested one
                            'overlay::dependency::closureBoundary': {
                                maxTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                                allowedMergeModes: ['append']
                            }
                        },
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'injected' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(OverlaySeamError);
    });

    test('empty authorityGrants map rejects all seams', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        authorityGrants: {}, // Empty — no seams granted
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'injected' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/not present in authorityGrants/);
    });

    test('rejection telemetry records seamGrantPresent=false for absent grant', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        try {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        authorityGrants: {}, // No grants
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'injected' }))
                            ]
                        }
                    },
                    runState
                }
            );
        } catch {
            // Expected rejection
        }

        // Telemetry should record the rejection with grant absence metadata
        expect(runState.telemetry.length).toBe(1);
        expect(runState.telemetry[0].activationDecision).toBe('REJECTED');
        expect(runState.telemetry[0].seamGrantPresent).toBe(false);
    });
});
