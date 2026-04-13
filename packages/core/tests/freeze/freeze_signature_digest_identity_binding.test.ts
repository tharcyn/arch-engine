import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'official', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Signature Digest Identity Binding', () => {
    test('Different signature digest payload results in different closure hash bound identity', () => {
        const adapter = new MockRegistryAdapter();
        
        const signatureA = createTestSignatureEnvelope('overlay-1', '1.0.0', 'official');
        const signatureB = createTestSignatureEnvelope('overlay-2', '1.0.0', 'official');

        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                        overlaySourceId: 'overlay-1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'official',
                        overlaySignature: signatureA,
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };

        const baseOptionsB = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-2'],
                        overlaySourceId: 'overlay-2',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'official',
                        overlaySignature: signatureB,
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        const resultA = executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        const resultB = executeLoaderPipeline('policy://core/test', adapter, baseOptionsB);

        const hashA = resultA.loaderClosureMetadata!.snapshotClosureGraphHash;
        const hashB = resultB.loaderClosureMetadata!.snapshotClosureGraphHash;

        expect(hashA).not.toBe(hashB);
        expect(resultA.loaderClosureMetadata!.closureProvenance!.signatureDigest)
            .not.toBe(resultB.loaderClosureMetadata!.closureProvenance!.signatureDigest);
    });
});
