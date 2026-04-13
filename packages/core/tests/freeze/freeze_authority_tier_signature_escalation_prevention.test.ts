import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope, wrapHandler } from './utils/wrapHandler.js';
import { setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';

describe('Freeze Evidence: Authority Tier Signature Escalation Prevention (F-6)', () => {

    test('external registry envelope cannot escalate to CORE_INTERNAL manually', () => {
        setAllowLegacySignatures(false);

        // Attacker creates a valid signature using external key
        const signature = createTestSignatureEnvelope('evil-overlay', '1.0.0', 'external');
        const validContextSignature = createTestSignatureEnvelope('anonymous-overlay', '0.0.0-unspecified', 'core');

        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        expect(() => {
            executeOverlaySeam(
                'overlay::manifest::mergeBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'external',
                        overlaySignature: validContextSignature,
                        overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        allowPrecedenceOverrides: true,
                        seamOverrides: {
                            'overlay::manifest::mergeBoundary': [
                                {
                                    overlaySourceId: 'evil-overlay',
                                    overlayVersion: '1.0.0',
                                    overlaySignature: signature,
                                    overlayRegistrySource: 'external',
                                    handler: (x) => x
                                }
                            ]
                        }
                    },
                    runState
                }
            );
        }).toThrowError(/Registry admission policy violation/i);
    });
});
