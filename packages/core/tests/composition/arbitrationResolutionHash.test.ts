import { describe, it, expect } from 'vitest';
import { computeArbitrationResolutionHash } from '../../src/composition/arbitrationResolutionHash.js';

describe('Phase 6: Arbitration Resolution Hash', () => {

  it('Test 1: Deterministically produces fixed cryptographic digest over resolution outputs', () => {
    const graphA = {
      'id1': { winningPolicy: 'a', losingPolicies: [], resolutionReason: 'x', resolutionTier: 'y', resolutionNamespace: 'z', resolutionTrustSource: 'a', resolutionRegistrySource: 'b', resolutionFallbackSource: 'none' }
    } as any;

    const graphB = {
      'id1': { winningPolicy: 'a', losingPolicies: [], resolutionFallbackSource: 'none', resolutionNamespace: 'z', resolutionReason: 'x', resolutionRegistrySource: 'b', resolutionTier: 'y', resolutionTrustSource: 'a' }
    } as any;

    const hashA = computeArbitrationResolutionHash(graphA);
    const hashB = computeArbitrationResolutionHash(graphB);

    expect(hashA).toBe(hashB);
    expect(typeof hashA).toBe('string');
    expect(hashA.length).toBe(64);
  });

});
