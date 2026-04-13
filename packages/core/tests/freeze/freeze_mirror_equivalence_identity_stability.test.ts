import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockPrimaryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'official', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

class MockMirrorAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'official', mirrorSourceId: 'mirror-1', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Mirror Equivalence Identity Stability', () => {
    test('Equivalent mirror outcome generates identical v3 closure identity', () => {
        const primaryAdapter = new MockPrimaryAdapter();
        const mirrorAdapter = new MockMirrorAdapter();
        
        const envelope = createTestSignatureEnvelope('overlay-1', '1.0.0', 'official');

        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                        overlaySourceId: 'overlay-1',
                    overlayVersion: '1.0.0',
                    overlayRegistrySource: 'official',
                    overlaySignature: envelope,
                    overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        const resultPrimary = executeLoaderPipeline('policy://core/test', primaryAdapter, baseOptions);
        const resultMirror = executeLoaderPipeline('policy://core/test', mirrorAdapter, baseOptions);

        const primaryHash = resultPrimary.loaderClosureMetadata!.snapshotClosureGraphHash;
        const mirrorHash = resultMirror.loaderClosureMetadata!.snapshotClosureGraphHash;

        expect(primaryHash).toBe(mirrorHash);
        expect(resultPrimary.loaderClosureMetadata!.closureProvenance!.manifestContentHash)
            .toBe(resultMirror.loaderClosureMetadata!.closureProvenance!.manifestContentHash);
    });
});
