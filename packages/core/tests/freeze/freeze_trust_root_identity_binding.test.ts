import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
  constructor(public regSource: string) { super(); }
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: this.regSource, manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Trust Root Identity Binding', () => {
    test('Different trust root resolution results in different closure hash bound identity', () => {
        const adapterCore = new MockRegistryAdapter('core');
        const adapterOfficial = new MockRegistryAdapter('official');
        
        // Use exact same payload digest and signature strings by mocking for identical envelope data
        const envelopeCore = createTestSignatureEnvelope('overlay-1', '1.0.0', 'core');
        const envelopeOfficial = createTestSignatureEnvelope('overlay-1', '1.0.0', 'official');

        const baseOptionsCore = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                    overlaySourceId: 'overlay-1',
                    overlayVersion: '1.0.0',
                    overlayRegistrySource: 'core',
                    overlaySignature: envelopeCore,
                    overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                    includeSeamExecutionInClosureHash: true,
                    allowPrecedenceOverrides: true
                }
            }
        };

        const baseOptionsOfficial = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-1'],
                    overlaySourceId: 'overlay-1',
                    overlayVersion: '1.0.0',
                    overlayRegistrySource: 'official',
                    overlaySignature: envelopeOfficial,
                    overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                    includeSeamExecutionInClosureHash: true,
                    allowPrecedenceOverrides: true
                }
            }
        };
        
        const resultCore = executeLoaderPipeline('policy://core/test', adapterCore, baseOptionsCore);
        const resultOfficial = executeLoaderPipeline('policy://core/test', adapterOfficial, baseOptionsOfficial);

        const hashA = resultCore.loaderClosureMetadata!.snapshotClosureGraphHash;
        const hashB = resultOfficial.loaderClosureMetadata!.snapshotClosureGraphHash;

        expect(hashA).not.toBe(hashB);
        expect(resultCore.loaderClosureMetadata!.closureProvenance!.registryTrustRootId).toBe('core.registry.root');
        expect(resultOfficial.loaderClosureMetadata!.closureProvenance!.registryTrustRootId).toBe('official.registry.root');
    });
});
