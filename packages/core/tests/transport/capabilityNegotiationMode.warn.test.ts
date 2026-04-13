import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities, CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';

describe('Phase 4.5: capabilityNegotiationMode WARN', () => {

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
    negotiationMode: CapabilityNegotiationMode.WARN
  };

  it('Test 1: WARN admits but attaches warnings', () => {
    const manifest = createManifest({ requiredCapabilities: ['missing-v1'] });
    
    expect(() => validateManifestCapabilities(manifest, 'ns', 'id', runtime, manifest)).not.toThrow();
    
    expect(manifest.negotiationWarnings).toBeDefined();
    expect(manifest.negotiationWarnings[0].code).toBe('CAPABILITY_NEGOTIATION_WARNING');
    expect(manifest.negotiationWarnings[0].missingCapabilities).toEqual(['missing-v1']);
    expect(manifest.negotiationWarnings[0].policyId).toBe('id');
  });

});
