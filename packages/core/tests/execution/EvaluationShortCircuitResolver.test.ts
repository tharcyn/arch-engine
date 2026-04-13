import { describe, it, expect } from 'vitest';
import { EvaluationShortCircuitResolver } from '../../src/execution/EvaluationShortCircuitResolver.js';

describe('Phase 7: Evaluation Short Circuit Resolver', () => {

  it('Test 1: Explicit mapping of DENY gracefully stops recursive sequences downstream', () => {
    const sequence = ['id1', 'id2', 'id3'];  // Linear mapping

    // Let's DENY id2 structure cleanly
    const resolver = new EvaluationShortCircuitResolver(
      sequence,
      { 'id2': 'DENY' } as any,
      {} as any,
      {} as any
    );

    const plan = resolver.resolve();

    // Sequence allows id1, hits id2 (stops execution flow recording upstream automatically), kills id3 natively
    expect(plan.executableSequence).toEqual(['id1']);
    expect(plan.terminatedBranches['id2']).toContain('Policy Resolution Evaluated to DENY');
    expect(plan.terminatedBranches['id3']).toContain('Branch halted recursively');
  });

});
