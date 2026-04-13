import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Unsigned UNTRUSTED_EXTERNAL Allowed (F-3)', () => {

    test('UNTRUSTED_EXTERNAL handler without signature is allowed (append mode)', () => {
        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary',
            () => ([1, 2, 3]),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        seamOverrides: {
                        'overlay::dependency::closureBoundary': [
                            {
                                overlaySourceId: 'unsigned-pack',
                                overlayVersion: '1.0.0',
                                // NO overlaySignature
                                handler: (core: any) => ([...core, 4])
                            }
                        ]
                    }
                }
            }
        );

        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('UNTRUSTED_EXTERNAL handler with signature is also allowed', () => {
        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary',
            () => ([1, 2]),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        seamOverrides: {
                        'overlay::dependency::closureBoundary': [
                            wrapHandler((core: any) => ([...core, 3]))
                        ]
                    }
                }
            }
        );

        expect(result).toEqual([1, 2, 3]);
    });

    test('TRUSTED_POLICY_PACK rejects execution if signature is missing (F-6 strict mode)', () => {
        setAllowLegacySignatures(false);

        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [
                                {
                                    overlaySourceId: 'trusted-internal',
                                    overlayVersion: '1.0.0',
                                    handler: () => ({ result: 'replaced' })
                                }
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Signature missing for signed-tier claim/);
    });

    test('CORE_INTERNAL rejects execution if signature is missing (F-6 strict mode)', () => {
        setAllowLegacySignatures(false);

        expect(() => {
            executeOverlaySeam(
                'overlay::registry::precedenceBoundary',
                () => ({ result: 'core' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::registry::precedenceBoundary': [
                                {
                                    overlaySourceId: 'core-pack',
                                    overlayVersion: '1.0.0',
                                    handler: () => ({ result: 'core-replaced' })
                                }
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Signature missing for signed-tier claim/);
    });
});
