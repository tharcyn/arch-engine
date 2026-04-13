import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
  }
}
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-9 Registry Namespace Impersonation Block', () => {
    test('external registry cannot publish partner or core namespace overlays', () => {
        const adapter = new MockRegistryAdapter();
        
        const tryImpersonate = (namespace: string) => {
            const options = {
                overlayExecutionContext: {
                    activation: {
                        activeOverlays: ['test-overlay'],
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        allowPrecedenceOverrides: true
                    }
                }
            };
            executeLoaderPipeline(namespace.startsWith('partner') ? 'policy://partner/test' : 'policy://core/test', adapter, options);
        };
        
        expect(() => tryImpersonate('partner.some.target')).toThrow(/authorization failed|Namespace ownership validation failed|Insufficient trust tier/);
        expect(() => tryImpersonate('core.platform.target')).toThrow(/authorization failed|Namespace ownership validation failed|Insufficient trust tier/);
        expect(() => tryImpersonate('official.packages.xyz')).toThrow(/authorization failed|Namespace ownership validation failed|Insufficient trust tier/);
    });

    test('partner registry cannot publish core overlays', () => {
        const adapter = new MockRegistryAdapter();
        
        const tryImpersonate = (namespace: string) => {
            const options = {
                overlayExecutionContext: {
                    activation: {
                        activeOverlays: ['test-overlay'],
                        overlayRegistrySource: 'partner',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        allowPrecedenceOverrides: true
                    }
                }
            };
            executeLoaderPipeline(namespace.startsWith('partner') ? 'policy://partner/test' : 'policy://core/test', adapter, options);
        };
        
        expect(() => tryImpersonate('core.platform.target')).toThrow(/authorization failed|Namespace ownership validation failed|Insufficient trust tier/);
        expect(() => tryImpersonate('core.auth')).toThrow(/authorization failed|Namespace ownership validation failed|Insufficient trust tier/);
        
        
    });
});
