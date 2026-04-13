import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities, CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.5: capabilityNegotiationMode FALLBACK', () => {

  const createManifest = (meta: any): HydratedPolicyManifest => ({
    extends: [],
    dependencies: [],
    namespaces: {},
    issuerData: [],
    manifestMetadata: meta
  });

  const runtime: LoaderRuntimeCapabilities = {
    engineVersion: '2.0.0',
    supportedLayers: ['security'],
    supportedDomains: ['network'],
    providedCapabilities: ['auth-v1'],
    negotiationMode: CapabilityNegotiationMode.FALLBACK
  };

  it('Test 1: FALLBACK admits if fallback capability is provided', () => {
    const manifest = createManifest({ 
      requiredCapabilities: ['missing-v1'],
      fallbackCapabilities: ['auth-v1']
    });
    
    expect(() => validateManifestCapabilities(manifest, 'ns', 'id', runtime, manifest)).not.toThrow();
    expect(manifest.executionMetadata.capabilityFallbackApplied).toBe(true);
  });

  it('Test 2: FALLBACK rejects if fallback also unavailable', () => {
    const manifest = createManifest({ 
      requiredCapabilities: ['missing-v1'],
      fallbackCapabilities: ['missing-v2']
    });
    
    try {
      validateManifestCapabilities(manifest, 'ns', 'id', runtime, manifest);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.MANIFEST_CAPABILITY_INCOMPATIBLE);
      expect(e.fallbackApplied).toBe(false);
    }
  });

});
