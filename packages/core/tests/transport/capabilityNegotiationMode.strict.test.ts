import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities, CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.5: capabilityNegotiationMode STRICT', () => {

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
    negotiationMode: CapabilityNegotiationMode.STRICT
  };

  it('Test 1: Strict rejects without mercy', () => {
    const manifest = createManifest({ requiredCapabilities: ['missing-v1'] });
    
    try {
      validateManifestCapabilities(manifest, 'ns', 'id', runtime, manifest);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.MANIFEST_CAPABILITY_INCOMPATIBLE);
      expect(e.negotiationMode).toBe(CapabilityNegotiationMode.STRICT);
    }
  });

});
