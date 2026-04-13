import { describe, it, expect } from 'vitest';
import { policyExecutionRuntimeEntry } from '../../../src/execution/PolicyExecutionRuntime.js';
import { deepFreezeDeterministic } from '../../../src/transport/deepFreezeDeterministic.js';

describe('Phase 8: Execution Runtime Context Integration Integration', () => {

  it('Test 1: Executes context layer validation successfully across explicit integration points cleanly', () => {
    const rootMeta = { a: 1 };
    deepFreezeDeterministic(rootMeta, '1');

    const graph = { executionOrderingGraph: [] } as any;

    const validContext = { principal: {}, resource: {}, tenant: 'abc', environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {} };

    expect(() => policyExecutionRuntimeEntry(rootMeta, [], graph, {} as any, validContext)).not.toThrow();
  });

  it('Test 2: Fails context layer logic gracefully triggering mapping rejections cleanly', () => {
    const rootMeta = { a: 1 };
    deepFreezeDeterministic(rootMeta, '1');

    const graph = { executionOrderingGraph: [] } as any;

    expect(() => policyExecutionRuntimeEntry(rootMeta, [], graph, {} as any, { bad: 1 }))
      .toThrow('Context validation failed downstream: Evaluation context is missing required key: principal');
  });

});
