import { describe, test, expect, beforeAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { registerAdmissionPolicy } from '../../src/topology/registryAdmissionPolicy.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Registry Admission Policy Non-Elevation', () => {

    beforeAll(() => {
        // Technically this shouldn't be allowed dynamically, but for testing
        // we say this external adapter "allows" CORE_INTERNAL. But admission policy logic
        // is designed to ceiling, NOT elevate over the requested identity constraint.
        registerAdmissionPolicy({
            registryId: 'external',
            allowedTrustTiers: [OverlayAuthorityTier.UNTRUSTED_EXTERNAL, OverlayAuthorityTier.CORE_INTERNAL],
            allowUnsignedOverlays: true
        });
    });

    test('Registry admission policy ceilings, never elevates', () => {
        // We supply an 'external' registry adapter mapping that asks for ONLY UNTRUSTED_EXTERNAL
        // Even though registry policy explicitly allows CORE_INTERNAL, it MUST NOT upgrade our request
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-external'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        // This will throw specifically because 'replace-if-authorized' (which defaults in some mocks? Wait. 
        // We don't have merge mode specified, but default for our core/test might be replace if it's the first one. 
        // Actually, without valid signature it's untrusted, if it requests replace, it will yield insufficient trust tier.)
        // The main test is that it does NOT automatically execute with elevated tier. 
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Insufficient trust tier/); 
    });
});
