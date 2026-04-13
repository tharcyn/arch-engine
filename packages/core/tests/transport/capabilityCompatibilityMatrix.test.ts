import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities } from '../../src/transport/validateManifestCapabilities.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';

describe('Phase 4: capabilityCompatibilityMatrix', () => {

  const createManifest = (meta: any): HydratedPolicyManifest => ({
    extends: [],
    dependencies: [],
    namespaces: {},
    issuerData: [],
    manifestMetadata: meta
  });

  const runtime: LoaderRuntimeCapabilities = {
    engineVersion: '2.0.0',
    supportedLayers: ['security', 'routing'],
    supportedDomains: ['network'],
    providedCapabilities: ['auth-v1']
  };

  it('Test 1: Acceptance matrix', () => {
    // Exact engine version match
    expect(() => validateManifestCapabilities(createManifest({ engineVersion: '2.0.0' }), 'ns', 'id', runtime)).not.toThrow();
    
    // Lower engine version match
    expect(() => validateManifestCapabilities(createManifest({ engineVersion: '1.9.9' }), 'ns', 'id', runtime)).not.toThrow();
    
    // Supported layer match
    expect(() => validateManifestCapabilities(createManifest({ policyLayer: 'security' }), 'ns', 'id', runtime)).not.toThrow();
    
    // Supported domain match
    expect(() => validateManifestCapabilities(createManifest({ domain: 'network' }), 'ns', 'id', runtime)).not.toThrow();
    
    // Optional capabilities not provided
    expect(() => validateManifestCapabilities(createManifest({ optionalCapabilities: ['foo-v1'] }), 'ns', 'id', runtime)).not.toThrow();
  });

  it('Test 2: Rejection matrix', () => {
    // Higher engine version
    expect(() => validateManifestCapabilities(createManifest({ engineVersion: '2.1.0' }), 'ns', 'id', runtime)).toThrow();
    
    // Unsupported layer
    expect(() => validateManifestCapabilities(createManifest({ policyLayer: 'frontend' }), 'ns', 'id', runtime)).toThrow();
    
    // Unsupported domain
    expect(() => validateManifestCapabilities(createManifest({ domain: 'ui' }), 'ns', 'id', runtime)).toThrow();
    
    // Missing required capability
    expect(() => validateManifestCapabilities(createManifest({ requiredCapabilities: ['missing-v1'] }), 'ns', 'id', runtime)).toThrow();
  });

});
