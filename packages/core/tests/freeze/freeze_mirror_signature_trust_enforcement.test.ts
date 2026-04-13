import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';
import { resolveWithMirrorFallback } from '../../src/transport/mirrorFallbackResolver.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { RegistryResolutionResult } from '../../src/transport/types.js';
import { setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';

describe('Freeze Evidence: Mirror Signature Trust Enforcement (F-5 / F-6)', () => {

    test('mirror fallback handler signature verification succeeds', () => {
        const envelope = createTestSignatureEnvelope('anonymous-overlay', '0.0.0-unspecified', 'official');
        setAllowLegacySignatures(false);

        class FailingAdapter extends RegistryAdapter {
            lookup(): RegistryResolutionResult { throw new Error('fail'); }
        }

        class MirrorAdapter extends RegistryAdapter {
            lookup(namespace: string, policyId: string): RegistryResolutionResult {
                return {
                    namespace, policyId,
                    availableVersions: ['1.0.0'],
                    registrySource: 'official', // the mirror must be at least official
                    mirrorSourceId: 'mirror-1',
                    manifests: { '1.0.0': { dependencies: [], extends: [], namespaces: { core: '1.0.0' }, issuerData: [], manifestMetadata: {}, capabilities: { required: [], provided: [] } } }
                };
            }
        }

        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // We run a mock mirror resolution
        const resolution = resolveWithMirrorFallback(
            'core', 'test',
            new FailingAdapter(),
            new MirrorAdapter(),
            undefined, // no pre-resolved
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    // Sign the mirror boundary overlay with a valid official key
                    overlaySignature: createTestSignatureEnvelope('anonymous-overlay', '0.0.0-unspecified', 'official'),
                    overlayRegistrySource: 'official',
                    seamOverrides: {
                        'overlay::transport::mirrorBoundary': [{
                            overlaySourceId: 'mirror-handler',
                            overlayVersion: '1.0.0',
                            overlayRegistrySource: 'official',
                            // Sign the handler with a valid official key
                            overlaySignature: createTestSignatureEnvelope('mirror-handler', '1.0.0', 'official'),
                            handler: (x) => x
                        }]
                    }
                },
                runState
            }
        );

        expect(resolution.mirrorUsed).toBe(true);
        expect(resolution.result.isMirrorFallback).toBe(true);

        const telemetry = runState.telemetry[0] as any;
        expect(telemetry.signaturePresent).toBe(true);
        console.log(telemetry); expect(telemetry.signatureValid).toBe(true);
        expect(telemetry.signatureVerificationMode).toBe('verified');
        expect(telemetry.signatureKeyId).toBe('official-ed25519-pubkey-001');
    });
});
