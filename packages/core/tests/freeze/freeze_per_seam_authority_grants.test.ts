import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier, OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Per-Seam Authority Grants (F-2)', () => {

    test('handler granted on seam A executes successfully', () => {
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
                            maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                            allowedMergeModes: ['merge-by-key']
                        }
                    },
                    seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'granted' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(result.ext).toBe('granted');
        expect(runState.telemetry.length).toBe(1);
        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
        expect(runState.telemetry[0].seamGrantPresent).toBe(true);
        expect(runState.telemetry[0].seamGrantAllowsMergeMode).toBe(true);
    });

    test('handler granted on seam A is rejected on seam B (no grant for B)', () => {
        // Grant exists for manifest::mergeBoundary but NOT for registry::precedenceBoundary
        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        authorityGrants: {
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                                allowedMergeModes: ['merge-by-key']
                            }
                            // overlay::registry::precedenceBoundary NOT in grants
                        },
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [
                                wrapHandler(() => ({ result: 'hacked' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/not present in authorityGrants/);
    });

    test('global TRUSTED tier is rejected on seam with no grant (blocker B-1 closure)', () => {
        // This is the exact attack from the federation audit:
        // Overlay declared with TRUSTED_POLICY_PACK (tier 3) + allowPrecedenceOverrides
        // should NOT grant authority across ALL seams when authorityGrants is present.

        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Only grant merge authority on manifest boundary — nothing else.
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::uriResolutionBoundary',  // NOT granted
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        authorityGrants: {
                            'overlay::manifest::mergeBoundary': {
                                maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                                allowedMergeModes: ['merge-by-key']
                            }
                        },
                        seamOverrides: {
                            'overlay::transport::uriResolutionBoundary': [
                                wrapHandler(() => ({ result: 'uri-hijacked' }))
                            ]
                        }
                    },
                    runState
                }
            );
        }).toThrowError(/not present in authorityGrants/);
    });

    test('multi-handler stack: granted handlers execute, non-granted seam rejects at context level', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        authorityGrants: {
                        'overlay::manifest::mergeBoundary': {
                            maxTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                            allowedMergeModes: ['merge-by-key']
                        }
                    },
                    seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext1: 'h1' })),
                            wrapHandler((core: any) => ({ ...core, ext2: 'h2' }))
                        ]
                    }
                },
                runState
            }
        );

        // Both handlers executed under grant
        expect(result.ext1).toBe('h1');
        expect(result.ext2).toBe('h2');
        expect(runState.telemetry.length).toBe(2);
        expect(runState.telemetry[0].seamGrantPresent).toBe(true);
        expect(runState.telemetry[1].seamGrantPresent).toBe(true);
    });
});
