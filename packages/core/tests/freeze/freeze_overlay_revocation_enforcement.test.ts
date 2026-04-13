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

describe('Freeze Evidence: Overlay Revocation Enforcement', () => {

    beforeAll(() => {
        registerOverlayRevocation({
            overlaySourceId: 'revoked-overlay-1',
                overlayRegistrySource: 'core',
            revocationScope: 'overlay',
            timestamp: new Date().toISOString(),
            reason: 'Compromised package'
        });
    });

    afterAll(() => {
        clearOverlayRevocations();
    });

    test('Revoked overlay halts execution pipeline entirely', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['revoked-overlay-1'],overlaySourceId: 'revoked-overlay-1',
                    overlayVersion: '1.0.0',
                    overlaySignature: 'sig:context-default',
                    overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Overlay explicitly revoked: scope \[overlay\]/);
    });
});
