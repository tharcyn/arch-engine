import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { evaluatePolicy } from '../src/policy/evaluator.js';
import { PolicyStackEntry } from '../src/policy/types.js';
import * as crypto from 'node:crypto';

describe('Phase 3B: deleted Lifecycle Activation', () => {

  const createEntry = (id: string, isDeleted: boolean): PolicyStackEntry => ({
    policyId: id,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      rules: {
        forbid: [
          { id: '1', from: 'service-a', to: 'service-b', deleted: isDeleted }
        ]
      }
    }
  });

  it('Test 1: deleted rule suppressed, lineage preserved, telemetry preserved', () => {
    const parent = createEntry('parent', false);
    const child = createEntry('child', true);

    const composed = composePolicies([parent, child]);
    const edges = [{ source: 'service-a', target: 'service-b' }];
    
    // evaluatePolicy expects composed policy config + graph
    const result = evaluatePolicy(
      edges,
      composed,
      'test-context',
      'test-hash'
    );

    // Violation should be in telemetry but suppressed
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].suppressedByDeletion).toBe(true);
    expect(result.violations[0].deletedReason).toBe('overridden');
    expect(result.violations[0].originPolicyId).toBe('child'); 
  });

});
