import { describe, it, expect } from 'vitest';
import { TrustOverrideResolver } from '../../src/composition/TrustOverrideResolver.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 6: Trust Override Resolver', () => {

  it('Test 1: Generates trust mapping resolving node accepted states', () => {
    const entries: PolicyStackEntry[] = [
      { policyNamespace: 'ns', policyId: 'id', executionMetadata: { dependencyDepth: 2 }, config: {} } as any
    ];

    const resolver = new TrustOverrideResolver(entries, {}, { 'ns/id': { tier: 'transitive' } } as any);
    const surface = resolver.resolve();

    expect(surface['ns/id'].trustAccepted).toBe(true);
    expect(surface['ns/id'].resolutionTier).toBe('transitive');
    expect(surface['ns/id'].resolutionDepth).toBe(2);
  });

});
