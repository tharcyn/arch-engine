import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Seam Grant Merge Mode Restriction (F-2)', () => {

    test('handler allowed merge-by-key is rejected for replace-if-authorized', () => {
        // Grant only allows merge-by-key, but seam uses replace-if-authorized
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary', // uses replace-if-authorized
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        authorityGrants: {
                            'overlay::registry::precedenceBoundary': {
                                maxTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                                allowedMergeModes: ['merge-by-key'] // does NOT include replace-if-authorized
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
        }).toThrowError(/not allowed for seam/);
    });

    test('handler allowed replace-if-authorized executes correctly', () => {
        const result = executeOverlaySeam(
            'overlay::registry::precedenceBoundary',
            () => ({ result: 'core' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    authorityGrants: {
                        'overlay::registry::precedenceBoundary': {
                            maxTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                            allowedMergeModes: ['replace-if-authorized'] // explicitly allowed
                        }
                    },
                    seamOverrides: {
                        'overlay::registry::precedenceBoundary': [
                            wrapHandler(() => ({ result: 'replaced' }), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                }
            }
        );

        expect(result.result).toBe('replaced');
    });

    test('handler allowed append but not merge-by-key is rejected on merge seam', () => {
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary', // uses merge-by-key
                () => ({ coreField: 'original' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        authorityGrants: {
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                                allowedMergeModes: ['append'] // does NOT include merge-by-key
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
        }).toThrowError(/not allowed for seam/);
    });

    test('telemetry captures merge mode restriction metadata', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary', // uses append mode
            () => ([1, 2, 3]),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        authorityGrants: {
                        'overlay::dependency::closureBoundary': {
                            maxTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                            allowedMergeModes: ['append']
                        }
                    },
                    seamOverrides: {
                        'overlay::dependency::closureBoundary': [
                            wrapHandler((core: any) => ([...core, 4]))
                        ]
                    }
                },
                runState
            }
        );

        expect(result).toEqual([1, 2, 3, 4]);
        expect(runState.telemetry[0].seamGrantPresent).toBe(true);
        expect(runState.telemetry[0].seamGrantAllowsMergeMode).toBe(true);
    });
});
