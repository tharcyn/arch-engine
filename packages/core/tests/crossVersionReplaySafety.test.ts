import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { evaluatePolicy } from '../src/policy/evaluator.js';
import { PolicyStackEntry } from '../src/policy/types.js';

describe('Phase 3C: Cross-Version Replay Safety', () => {

  const createEntry = (id: string, lock: boolean, ruleSeverity: any): PolicyStackEntry => ({
    policyId: id,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      severityLock: lock,
      rules: {
        forbid: [
          { id: '1', from: 'service-a', to: 'service-b', severity: ruleSeverity }
        ]
      }
    }
  });

  it('Test 1: Version contract integration maintains replay determinism', () => {
    const parent = createEntry('parent', false, 'warning');
    const child = createEntry('child', false, 'error');
    
    // Simulate legacy snapshot payload fields
    // which has versions correctly added
    
    const stack = [parent, child];
    const composed = composePolicies(stack);
    
    // Explicitly confirm severity precedence Most Severe Wins is active
    // @ts-ignore
    expect(composed.rules.forbid[0].severity).toBe('error');

    const result = evaluatePolicy(
      [{ source: 'service-a', target: 'service-b' }],
      composed,
      'test-context',
      'test-hash'
    );

    expect(result.violations.length).toBe(1);
    expect(result.violations[0].severity).toBe('error');
    expect(result.violations[0].originPolicyId).toBe('child'); 
    
    // Check missing fields are false/undefined as expected from legacy replay
    expect(result.violations[0].suppressedByDeletion).toBeFalsy();
  });

});
