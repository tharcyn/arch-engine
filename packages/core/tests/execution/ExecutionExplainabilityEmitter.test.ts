import { describe, it, expect } from 'vitest';
import { ExecutionExplainabilityEmitter } from '../../src/execution/ExecutionExplainabilityEmitter.js';

describe('Phase 7: Execution Explainability Emitter', () => {

  it('Test 1: Generates readable lineage traces merging all downstream resolution sets', () => {
    const result = { decisionChain: ['a', 'b'] } as any;
    const plan = { terminatedBranches: { 'c': 'stop' } } as any;

    const resolver = new ExecutionExplainabilityEmitter(
      result, plan, 
      { loserSuppressionChain: ['suppress A'], fallbackActivationChain: [], trustOverrideChain: [], namespaceOverrideChain: [] } as any
    );

    const trace = resolver.mapGraph();
    expect(trace.evaluationTerminationNodes).toContain('c');
    expect(trace.decisionOrigin).toContain('gracefully at nodes [c]');
    expect(trace.suppressionLineage).toContain('suppress A');
  });

});
