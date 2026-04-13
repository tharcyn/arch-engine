import { describe, it, expect } from 'vitest';
import { propagateRequiredCapabilities } from '../../src/transport/propagateRequiredCapabilities.js';
import { LoaderRuntimeCapabilities } from '../../src/transport/validateManifestCapabilities.js';
import { PolicyStackEntry } from '../../src/policy/types.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.5: propagateRequiredCapabilities', () => {

  const runtime: LoaderRuntimeCapabilities = {
    engineVersion: '2.0.0',
    supportedLayers: ['security', 'routing'],
    supportedDomains: ['network'],
    providedCapabilities: ['auth-v1']
  };

  const createEntry = (id: string, ext: string[], reqs?: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1, extends: ext },
    transitiveRequiredCapabilities: reqs || []
  });

  it('Test 1: Recursively collects and sorts distinct capabilities', () => {
    const parent = createEntry('parent', ['childA', 'childB']);
    const childA = createEntry('childA', [], ['auth-v1']);
    const childB = createEntry('childB', [], ['auth-v1']);
    
    // We modify runtime to provide all for testing closure aggregation without throwing
    const rt = { ...runtime, providedCapabilities: ['auth-v1'] };
    const closure = propagateRequiredCapabilities([parent, childA, childB], parent, rt);
    expect(closure).toEqual(['auth-v1']);
    expect(parent.transitiveRequiredCapabilities).toEqual(['auth-v1']);
  });

  it('Test 2: Throws if closure reveals missing capability', () => {
    const parent = createEntry('parent', ['childA']);
    const childA = createEntry('childA', [], ['missing-v1']);
    
    try {
      propagateRequiredCapabilities([parent, childA], parent, runtime);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.TRANSITIVE_CAPABILITY_INCOMPATIBLE);
      expect(e.missingCapabilities).toEqual(['missing-v1']);
    }
  });

});
