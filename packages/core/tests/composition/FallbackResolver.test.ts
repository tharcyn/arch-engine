import { describe, it, expect } from 'vitest';
import { FallbackResolver } from '../../src/composition/FallbackResolver.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 6: Fallback Resolver', () => {

  it('Test 1: Evaluates fallback exhaustion successfully when safe', () => {
    const entries: PolicyStackEntry[] = [
      { policyNamespace: 'ns', policyId: 'id', config: { fallback: 'otherId' } } as any
    ];

    // High precedence score (e.g. root) -> safe fallback
    const resolver = new FallbackResolver(entries, { 'ns/id': { tierScore: 1000 } } as any);
    const surface = resolver.resolve();

    expect(surface['ns/id'].fallbackAvailable).toBe(true);
    expect(surface['ns/id'].hasFallback).toBe(true);
  });

  it('Test 2: Throws on logic exhaustion (fallback too deep to be safe)', () => {
    const entries: PolicyStackEntry[] = [
      { policyNamespace: 'ns', policyId: 'id', config: { fallback: 'otherId' } } as any
    ];

    // Low precedence score (e.g. extremely deep nesting) -> unsafe fallback limits
    const resolver = new FallbackResolver(entries, { 'ns/id': { tierScore: 400 } } as any);
    expect(() => resolver.resolve()).toThrow('Coverage exhaustion failed for keys: [ns/id]');
  });

});
