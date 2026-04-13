import { describe, test, expect, beforeAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { registerAdmissionPolicy } from '../../src/topology/registryAdmissionPolicy.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'strict-external', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Registry Admission Policy Enforcement', () => {

    beforeAll(() => {
        registerAdmissionPolicy({
            registryId: 'strict-external',
            allowedTrustTiers: [OverlayAuthorityTier.UNTRUSTED_EXTERNAL],
            allowUnsignedOverlays: false // strict rejection mode
        });
    });

    test('Registry admission policy ceilings authority', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-strict'],
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Registry strict-external policy rejects|Registry admission policy violation/);
    });
});
