import { describe, it, expect } from 'vitest';
import { validateManifestCapabilities, LoaderRuntimeCapabilities } from '../../src/transport/validateManifestCapabilities.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';

describe('Phase 4: validateManifestCapabilities', () => {

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

  it('Test 1: Compatible manifest passes', () => {
    const manifest = createManifest({
      engineVersion: '1.5.0',
      policyLayer: 'security',
      domain: 'network',
      requiredCapabilities: ['auth-v1']
    });
    expect(() => validateManifestCapabilities(manifest, 'ns', 'id', runtime)).not.toThrow();
  });

  it('Test 2: Incompatible engine version throws', () => {
    const manifest = createManifest({
      engineVersion: '3.0.0'
    });
    try {
      validateManifestCapabilities(manifest, 'ns', 'id', runtime);
      expect.fail('Should have thrown capability error');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.MANIFEST_CAPABILITY_INCOMPATIBLE);
      expect(e.requiredEngineVersion).toBe('3.0.0');
    }
  });

  it('Test 3: Missing required capability throws', () => {
    const manifest = createManifest({
      engineVersion: '1.0.0',
      requiredCapabilities: ['auth-v2']
    });
    try {
      validateManifestCapabilities(manifest, 'ns', 'id', runtime);
      expect.fail('Should have thrown capability error');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.MANIFEST_CAPABILITY_INCOMPATIBLE);
      expect(e.missingCapabilities).toEqual(['auth-v2']);
    }
  });

});
