import { describe, it, expect } from 'vitest';
import { hydratePolicyManifest } from '../../src/transport/hydratePolicyManifest.js';

describe('Phase 4: hydratePolicyManifest', () => {

  it('Test 1: Hydrates correct shape mapping', () => {
    const raw = {
      extends: ['abc'],
      dependencies: ['dep-a'],
      manifestMetadata: { created: 'ok' }
    };
    
    const hydrated = hydratePolicyManifest('ns', 'id', raw, '9.9.9');
    expect(hydrated.extends).toEqual(['abc']);
    expect(hydrated.dependencies).toEqual(['dep-a']);
    expect(hydrated.manifestMetadata.created).toBe('ok');
  });

  it('Test 2: hydratePolicyManifest_requires_engineVersion', () => {
    // TypeScript should naturally fail if missing, so we'll cast to any to test the runtime explicitly
    const raw = { manifestMetadata: { requiredCapabilities: ['missing-cap-x'] } };
    expect(() => hydratePolicyManifest('ns', 'id', raw, undefined as any)).toThrowError();
  });

});
