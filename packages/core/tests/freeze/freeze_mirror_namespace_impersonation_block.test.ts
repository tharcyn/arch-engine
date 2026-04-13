import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
  }
}
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-9 Mirror Namespace Impersonation Block', () => {
    test('a mirror registry serving an unowned namespace origin is rejected', () => {
        const adapter = new MockRegistryAdapter();
        
        const options = {
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['test-overlay'],
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };

        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, options);
        }).toThrow(/authorization failed|Namespace ownership validation failed/); 
    });
});
