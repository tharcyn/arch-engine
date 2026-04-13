import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
  }
}
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-9 Namespace Normalization Impersonation', () => {
    test('rejects malicious normalization bypass attempts on core.* ownership', () => {
        const adapter = new MockRegistryAdapter();
        
        const baseOptions = {
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['test-overlay'],
                    overlayRegistrySource: 'external',
                    overlaySignature: 'sig:context-default',
                    overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                    allowPrecedenceOverrides: true
                }
            }
        };

        const tryNamespace = (ns: string) => {
            const options = { ...baseOptions };
            options.overlayExecutionContext.activation.overlayNamespace = ns;
            executeLoaderPipeline('policy://core/test', adapter, options);
        };
        
        // Attempting to bypass core rule using invalid characters
        expect(() => tryNamespace('core..policy')).toThrow(/MALFORMED_NAMESPACE/);
        expect(() => tryNamespace('core .policy')).toThrow(/MALFORMED_NAMESPACE/);
        expect(() => tryNamespace('Core.policy')).toThrow(/authorization failed|Namespace ownership validation failed/); // Resolves as core.policy and hits unowned registry rejection
        expect(() => tryNamespace('partner..x')).toThrow(/MALFORMED_NAMESPACE/);
        expect(() => tryNamespace('.core.policy')).toThrow(/MALFORMED_NAMESPACE/);
        expect(() => tryNamespace('core.policy.')).toThrow(/MALFORMED_NAMESPACE/);
    });
});
