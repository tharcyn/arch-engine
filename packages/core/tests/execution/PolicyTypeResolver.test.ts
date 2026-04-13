import { describe, it, expect } from 'vitest';
import { PolicyTypeResolver } from '../../src/execution/PolicyTypeResolver.js';

describe('Phase 7: Policy Type Resolver', () => {

  it('Test 1: Maps resolution models deterministically matching upstream rules', () => {
    const arbitrationGraph = {
      'id1': { winningPolicy: 'ns/id1', resolutionTrustSource: 'rejected', resolutionTier: 'direct' },
      'id2': { winningPolicy: 'ns/id2', resolutionTrustSource: 'accepted', resolutionFallbackSource: 'active' },
      'id3': { winningPolicy: 'ns/id3', resolutionTier: 'root', resolutionTrustSource: 'accepted' },
      'id4': { winningPolicy: 'ns/id4', resolutionTier: 'transitive', resolutionTrustSource: 'accepted' },
      'id5': { winningPolicy: 'ns/id5', resolutionTier: 'direct', resolutionTrustSource: 'accepted' }
    } as any;

    const resolver = new PolicyTypeResolver(arbitrationGraph, {} as any);
    const output = resolver.resolve();

    expect(output['id1']).toBe('DENY');       // Trust reject overrides everything
    expect(output['id2']).toBe('TRANSFORM');  // Fallback activation
    expect(output['id3']).toBe('ALLOW');      // Root node defaults ALLOW
    expect(output['id4']).toBe('AGGREGATE');  // Transitive defaults AGGREGATE
    expect(output['id5']).toBe('ANNOTATE');   // Direct dependency defaults ANNOTATE
  });

});
