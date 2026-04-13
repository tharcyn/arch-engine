import { describe, it, expect } from 'vitest';
import { ExecutionContextSerializer } from '../../../src/execution/context/ExecutionContextSerializer.js';

describe('Phase 8: Execution Context Serializer', () => {

  it('Test 1: Generates safe determinism string mappings alongside detached SHA-256 boundaries effectively', () => {
    const model = { principal: { id: 'test' }, resource: {}, tenant: '', environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {} };
    
    const serializer = new ExecutionContextSerializer(model as any);
    const serialized = serializer.serialize();

    expect(typeof serialized.serializedEvaluationContext).toBe('string');
    expect(serialized.executionContextHash.length).toBe(64);

    // Identity check against string properties explicitly
    expect(serialized.serializedEvaluationContext).toContain('"principal":{"id":"test"}');
  });

});
