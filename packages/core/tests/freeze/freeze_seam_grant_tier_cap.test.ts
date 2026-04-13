import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Seam Grant Tier Cap (F-2)', () => {

    test('handler with global tier 3 is capped to grant maxTier 2 and rejected for replace-if-authorized', () => {
        // Global tier = TRUSTED_POLICY_PACK (3), which normally allows replace-if-authorized.
        // But grant caps to SIGNED_EXTERNAL_PACK (2), which is insufficient.
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary', // requires >= 3 for replace-if-authorized
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        authorityGrants: {
                            'overlay::registry::precedenceBoundary': {
                                maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, // caps to 2
                                allowedMergeModes: ['replace-if-authorized']
                            }
                        },
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [
                                wrapHandler(() => ({ result: 'hacked' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Insufficient trust tier/);
    });

    test('handler with global tier 2 executes when grant maxTier is 3 (grant does not expand)', () => {
        // Global tier = SIGNED_EXTERNAL_PACK (2).
        // Grant maxTier = TRUSTED_POLICY_PACK (3).
        // effective = min(2, 3) = 2. Merge-by-key requires >= 2.
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        authorityGrants: {
                        'overlay::manifest::mergeBoundary': {
                            maxTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK, // 3 (would allow more)
                            allowedMergeModes: ['merge-by-key']
                        }
                    },
                    seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'ok' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(result.ext).toBe('ok');
        // Authority tier in telemetry should be min(2, 3) = 2
        expect(runState.telemetry[0].authorityTier).toBe(OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
        expect(runState.telemetry[0].seamGrantMaxTier).toBe(OverlayAuthorityTier.TRUSTED_POLICY_PACK);
    });

    test('handler with global tier 4 capped to grant maxTier 1 fails merge-by-key', () => {
        // Global = CORE_INTERNAL (4), grant caps to UNTRUSTED_EXTERNAL (1).
        // effective = min(4, 1) = 1. Merge-by-key requires >= 2.
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        authorityGrants: {
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                                allowedMergeModes: ['merge-by-key']
                            }
                        },
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'hacked' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Insufficient trust tier/);
    });

    test('P-1 numeric ceiling clamp still active under seam grants', () => {
        // Global tier = 999 (adversarial), should be clamped to UNTRUSTED_EXTERNAL (1) by P-1.
        // Grant maxTier = CORE_INTERNAL (4). min(1, 4) = 1.
        // merge-by-key requires >= 2. Should fail.
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: 999 as any,
                        authorityGrants: {
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.CORE_INTERNAL,
                                allowedMergeModes: ['merge-by-key']
                            }
                        },
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'hacked' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Insufficient trust tier/);
    });
});
