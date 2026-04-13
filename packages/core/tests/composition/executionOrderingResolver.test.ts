import { describe, it, expect } from 'vitest';
import { ExecutionOrderingResolver } from '../../src/composition/ExecutionOrderingResolver.js';

describe('Phase 5: Execution Ordering Resolver', () => {

  it('Test 1: Flattens and reverses execution ordering for evaluation sequence', () => {
    const graph = {
      executionOrderingGraph: ['A', 'B', 'C'],
      policyLayeringGraph: { 'root': ['A'], 'direct': ['B'], 'transitive': ['C'] }
    } as any;
    
    // Mock entries to satisfy Phase 8.5 stable ordering requirements
    const entries = [
      { policyId: 'A', executionMetadata: { stackIndex: 1, dependencyDepth: 0 } },
      { policyId: 'B', executionMetadata: { stackIndex: 2, dependencyDepth: 1 } },
      { policyId: 'C', executionMetadata: { stackIndex: 3, dependencyDepth: 2 } }
    ] as any;

    const resolver = new ExecutionOrderingResolver(graph, entries);
    const result = resolver.resolve();

    // Sort logic sorts ascending: A (depth 0), B (depth 1), C (depth 2)
    // Then reverses to output: C, B, A (deepest first)
    expect(result.sequence).toEqual(['C', 'B', 'A']); 
    expect(result.resolvedTiers).toContain('root');
  });

});
