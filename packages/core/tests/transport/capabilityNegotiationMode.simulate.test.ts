import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities, CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';

describe('Phase 4.5: capabilityNegotiationMode SIMULATE', () => {

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
    negotiationMode: CapabilityNegotiationMode.SIMULATE
  };

  it('Test 1: SIMULATE never rejects and outputs matrix', () => {
    const manifest = createManifest({ 
      engineVersion: '3.0.0',
      policyLayer: 'unknown',
      domain: 'unknown',
      requiredCapabilities: ['missing-v1']
    });
    
    expect(() => validateManifestCapabilities(manifest, 'ns', 'id', runtime, manifest)).not.toThrow();
    
    expect(manifest.simulatedCapabilityCompatibility).toBeDefined();
    expect(manifest.simulatedCapabilityCompatibility.missingCapabilities).toEqual(['missing-v1']);
    expect(manifest.simulatedCapabilityCompatibility.incompatibleLayers).toEqual(['unknown']);
    expect(manifest.simulatedCapabilityCompatibility.incompatibleDomains).toEqual(['unknown']);
  });

});
