import { describe, it, expect } from 'vitest';
import { MirrorSubstitutionResolver } from '../../src/composition/MirrorSubstitutionResolver.js';

describe('Phase 6: Mirror Substitution Resolver', () => {

  it('Test 1: Validates mirror hashes cleanly', () => {
    const resolver = new MirrorSubstitutionResolver('hash1', 'hash2', 'hash3');
    const surface = resolver.resolve();

    expect(surface['default'].isMirrorDivergent).toBe(false);
    expect(surface['default'].resolvedSourceHash).toBe('hash1');
  });

  it('Test 2: Throws mirror divergence exception on missing critical bounds', () => {
    const resolver = new MirrorSubstitutionResolver('', 'hash2', 'hash3');
    expect(() => resolver.resolve()).toThrow('Mirror substitution failed');
  });

});
