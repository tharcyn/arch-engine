import { describe, it, expect } from 'vitest';
import { computeContextResolutionHash } from '../../../src/execution/context/contextResolutionHash.js';

describe('Phase 8: Context Resolution Hash', () => {

  it('Test 1: Confirms evaluation environment contexts generate fixed stable hash footprints without mapping structural identity limits', () => {
    // Both objects structurally equivalent when canonical stringified
    const contextA = { principal: {}, resource: {}, tenant: 'A', environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {} };
    const contextB = { temporal: {}, tenant: 'A', request: {}, featureFlags: {}, principal: {}, error: undefined, resource: {}, environment: {}, trustAnchors: {}, customSignals: {} };

    const hashA = computeContextResolutionHash(contextA as any);
    const hashB = computeContextResolutionHash(contextB as any);

    expect(hashA).toBe(hashB);
  });

});
