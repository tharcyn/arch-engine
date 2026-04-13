import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { registerOverlayRevocation, clearOverlayRevocations } from '../../src/topology/overlayRevocationList.js';
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

describe('Freeze Evidence: Revocation Precedes Trust Root Rotation Resolution', () => {

    beforeAll(() => {
        // 1. Revoke the registry root
        registerTrustRootRotation({
            trustRootId: 'partner.registry.root',
            revoked: true,
            timestamp: new Date().toISOString()
        });

        // 2. Revoke the specific overlay
        registerOverlayRevocation({
            overlaySourceId: 'overlay-ordering-test',
                overlayRegistrySource: 'core',
            revocationScope: 'overlay',
            timestamp: new Date().toISOString()
        });
    });

    afterAll(() => {
        clearOverlayRevocations();
        // (Assuming we'd clear rotations if we could, but mock registry just persists it within the test run)
    });

    test('Overlay revocation is evaluated and halts execution before trust-root rotation failure can trigger', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-ordering-test'],overlaySourceId: 'overlay-ordering-test',
                    overlayVersion: '1.0.0',
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
            // Must catch the revocation failure FIRST, not the "Trust root revoked" or "No trust root found"
            // that happens later during signature verification.
            expect(e.message).toMatch(/Overlay explicitly revoked: scope \[overlay\]/);
            expect(e.message).not.toMatch(/trust root/i);
        }
    });

});
