import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Invalid Signature No Provenance Binding', () => {
    test('Invalid signature parsing prevents closure provenance emission entirely', () => {
        const adapter = new MockRegistryAdapter();
        
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'invalid-signature-data',
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        // Assert that the pipeline rejects execution BEFORE reaching any provenance-bound identity emission
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Signature invalid for signed-tier claim/);
    });
});
