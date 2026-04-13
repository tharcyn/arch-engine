import { describe, it, expect } from 'vitest';
import { computeExecutionResolutionHash } from '../../src/execution/executionResolutionHash.js';

describe('Phase 7: Execution Resolution Hash', () => {

  it('Test 1: Produces fixed hash diagnostic signature natively', () => {
    const surfaceA = {
      finalDecision: 'ALLOW',
      decisionChain: ['a', 'b'],
      suppressionChain: [],
      annotationChain: {},
      fallbackChain: [],
      namespaceOverrideChain: [],
      trustOverrideChain: []
    } as any;

    const surfaceB = {
      fallbackChain: [],
      finalDecision: 'ALLOW',
      annotationChain: {},
      decisionChain: ['a', 'b'],
      suppressionChain: [],
      trustOverrideChain: [],
      namespaceOverrideChain: []
    } as any;

    const hashA = computeExecutionResolutionHash(surfaceA);
    const hashB = computeExecutionResolutionHash(surfaceB);

    expect(hashA).toBe(hashB);
    expect(hashA.length).toBe(64);
  });

});
