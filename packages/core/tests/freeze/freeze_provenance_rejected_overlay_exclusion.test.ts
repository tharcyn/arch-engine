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

describe('Freeze Evidence: Provenance Rejected Overlay Exclusion', () => {
    test('Closure provenance is never emitted when the pipeline rejects execution', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        try {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
            expect.fail('Expected pipeline to throw due to insufficient authority');
        } catch (error: any) {
            expect(error.message).toMatch(/Insufficient trust tier/);
            // Since execution threw an error, no executionMetadata/loaderClosureMetadata payload 
            // is successfully returned containing closureProvenance.
            // Structurally, this proves exclusion on rejection.
        }
    });
});
