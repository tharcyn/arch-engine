import { describe, test, expect, vi } from 'vitest';
import * as seamOrch from '../../src/topology/seamOrchestrator.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Unsigned Overlay Identity Sentinel', () => {
    test('UNTRUSTED_EXTERNAL with no signature binds __unsigned__ sentinel', () => {
        // Bypass overlay seam authorization errors for this specific execution test
        vi.spyOn(seamOrch, 'executeOverlaySeam').mockImplementation((seamId, base) => base());

        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                        overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        try {
            const result = executeLoaderPipeline('policy://core/test', adapter, baseOptions);
            expect(result.loaderClosureMetadata!.closureProvenance!.signatureDigest).toBe('__unsigned__');
        } finally {
            vi.restoreAllMocks();
        }
    });
});
