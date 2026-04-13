import { describe, it, expect } from 'vitest';
import { policyExecutionRuntimeEntry } from '../../src/execution/PolicyExecutionRuntime.js';
import { deepFreezeDeterministic } from '../../src/transport/deepFreezeDeterministic.js';

describe('Phase 7: Policy Execution Runtime', () => {

  const validContext = { principal: {}, resource: {}, tenant: 'abc', environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {} };

  it('Test 1: Passes perfectly formatted certified sealed metadata arrays', () => {
    const rootMeta = { test: true };
    deepFreezeDeterministic(rootMeta, 'mock');

    const graph = { executionOrderingGraph: [] } as any;

    expect(() => policyExecutionRuntimeEntry(rootMeta, [], graph, {} as any, validContext)).not.toThrow();
  });

  it('Test 2: Defensively isolates against manually mutated un-frozen models passed from planners', () => {
    const rootMeta = { test: true, unfrozenNode: { a: 1 } }; 
    // Do NOT freeze rootMeta

    const graph = { executionOrderingGraph: [] } as any;

    expect(() => policyExecutionRuntimeEntry(rootMeta, [], graph, {} as any, validContext)).toThrow('unfrozen metadata structure');
  });

});
