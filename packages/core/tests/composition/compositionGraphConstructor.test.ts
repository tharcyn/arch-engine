import { describe, it, expect } from 'vitest';
import { CompositionGraphConstructor } from '../../src/composition/CompositionGraphConstructor.js';

describe('Phase 5: Composition Graph Constructor', () => {

  it('Test 1: Constructs tiered evaluation tree cleanly from sealed adjacency map', () => {
    const plan = {
      mergePlanGraph: ['A', 'B'],
      resolutionOrdering: ['B', 'A'],
      policyPrecedenceLayering: {},
      fallbackResolutionSurfaces: [],
      deterministic: true
    } as any;

    const rootEntry = {
        executionMetadata: {
            dependencyAdjacencySurface: {
                'A': ['B'],
                'B': []
            } 
        }
    } as any;

    const constructor = new CompositionGraphConstructor(plan, rootEntry);
    const graph = constructor.construct();

    expect(graph.executionOrderingGraph).toEqual(['A', 'B']);
    expect(graph.tieredEvaluationTree['A']).toContain('B');
  });

});
