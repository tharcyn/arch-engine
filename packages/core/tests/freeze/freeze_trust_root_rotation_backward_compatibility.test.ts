import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { registerTrustRootRotation } from '../../src/topology/registryTrustLifecycle.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'partner', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Trust Root Rotation Backward Compatibility', () => {

    beforeAll(() => {
        // Revoke partner root
        registerTrustRootRotation({
            trustRootId: 'partner.registry.root',
            revoked: true,
            timestamp: new Date().toISOString()
        });
    });

    // Note: We don't have a clear function for registry lifecycle yet, but in an actual
    // run this stays revoked for the test file

    test('Revoked trust root cannot validate new overlays', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-partner'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        allowPrecedenceOverrides: false
                }
            }
        };
        
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Insufficient trust tier for replace-if-authorized merge mode/);
    });
});
