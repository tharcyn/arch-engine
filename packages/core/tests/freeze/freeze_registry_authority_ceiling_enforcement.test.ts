import { describe, test, expect, beforeAll } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

// The ceiling enforcement relies on Admission policies
// but natively if we just use "partner" registry, it naturally maxes out at PARTNER_REGISTRY
// if we don't have special admission overrides.

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'partner', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Registry Authority Ceiling Enforcement', () => {

    test('Registry signature root defines the absolute authority ceiling regardless of what the payload asks for', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-partner'],
                    overlayRegistrySource: 'partner',
                    overlayTrustTier: OverlayAuthorityTier.CORE_INTERNAL,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrowError(/Registry admission policy violation: partner cannot elevate payload/);
    });
});
