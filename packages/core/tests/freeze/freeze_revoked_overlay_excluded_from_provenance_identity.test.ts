import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { registerOverlayRevocation, clearOverlayRevocations } from '../../src/topology/overlayRevocationList.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Revoked Overlay Excluded From Provenance Identity', () => {

    beforeAll(() => {
        registerOverlayRevocation({
            overlaySourceId: 'revoked-identity',
                overlayRegistrySource: 'core',
            revocationScope: 'overlay',
            timestamp: new Date().toISOString()
        });
    });

    afterAll(() => {
        clearOverlayRevocations();
    });

    test('Revoked overlay prevents pipeline from reaching provenance identity mapping', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['revoked-identity'],
                        overlaySourceId: 'revoked-identity',
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        try {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
            expect.fail('Must throw');
        } catch (e: any) {
            expect(e.message).toMatch(/Overlay explicitly revoked/);
            // Provenance mapping happens downstream. Exception guarantees exclusion.
        }
    });

});
