import { describe, it, expect } from 'vitest';
import { ResultAggregationResolver } from '../../src/execution/ResultAggregationResolver.js';

describe('Phase 7: Result Aggregation Resolver', () => {

  it('Test 1: Consolidates execution arrays into flat matrix successfully', () => {
    const resolver = new ResultAggregationResolver(
      { 'id1': 'ALLOW', 'id2': 'TRANSFORM' } as any,
      { executableSequence: ['id1', 'id2'], terminatedBranches: {} } as any,
      { 'a': 1 } as any,
      { trustOverrideChain: [], fallbackActivationChain: [], namespaceOverrideChain: [] } as any
    );

    const result = resolver.resolve();
    
    // final active gate wins ('id2' mapped to 'TRANSFORM')
    expect(result.finalDecision).toBe('TRANSFORM');
    expect(result.decisionChain).toEqual(['id1', 'id2']);
    expect(result.annotationChain['a']).toBe(1);
    expect(result.suppressionChain.length).toBe(0);
  });

  it('Test 2: Short Circuit terminations safely bubble up root DENY overrides', () => {
    const resolver = new ResultAggregationResolver(
      {} as any,
      { executableSequence: ['id1'], terminatedBranches: { 'id2': 'stop' } } as any,
      {} as any,
      { trustOverrideChain: [], fallbackActivationChain: [], namespaceOverrideChain: [] } as any
    );

    const result = resolver.resolve();
    expect(result.finalDecision).toBe('DENY');
    expect(result.suppressionChain).toContain('id2');
  });

});
