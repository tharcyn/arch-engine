import { describe, it, expect } from 'vitest';
import { computeCapabilityClosureHash } from '../../src/transport/capabilityClosureCache.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.6: capabilityClosureCache', () => {

  const createEntry = (id: string, ext: string[], caps: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1, extends: ext },
    transitiveRequiredCapabilities: caps
  });

  it('Test 1: Stable identical hash for identical graph', () => {
    const a = createEntry('a', ['b'], ['auth']);
    const b = createEntry('b', [], ['logging']);
    const hash1 = computeCapabilityClosureHash([a, b], a);
    const hash2 = computeCapabilityClosureHash([a, b], a);
    expect(hash1).toBe(hash2);
  });

  it('Test 2: Hash changes when transitive capability changes', () => {
    const a = createEntry('a', ['b'], ['auth']);
    const b = createEntry('b', [], ['logging']);
    const hash1 = computeCapabilityClosureHash([a, b], a);
    
    a.transitiveRequiredCapabilities = ['auth', 'gpu'];
    const hash2 = computeCapabilityClosureHash([a, b], a);
    expect(hash1).not.toBe(hash2);
  });

  it('Test 3: Hash changes when dependency lineage changes', () => {
    const a = createEntry('a', ['b'], ['auth']);
    const b = createEntry('b', [], ['logging']);
    const hash1 = computeCapabilityClosureHash([a, b], a);
    
    const a2 = createEntry('a', [], ['auth']);
    const hash2 = computeCapabilityClosureHash([a2, b], a2);
    expect(hash1).not.toBe(hash2);
  });

});
