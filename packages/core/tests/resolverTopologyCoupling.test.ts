import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { PolicyStackEntry } from '../src/policy/types.js';
import * as crypto from 'node:crypto';

describe('Phase 3C: Resolver-Topology Coupling Freeze', () => {

  const createEntry = (id: string, lock: boolean, ruleSeverity: any, isDeleted: boolean): PolicyStackEntry => ({
    policyId: id,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      severityLock: lock,
      severityPolicy: 'strict',
      deleted: isDeleted,
      rules: {
        forbid: [
          { id: '1', from: 'service-a', to: 'service-b', severity: ruleSeverity, deleted: isDeleted }
        ]
      }
    }
  });

  it('Test 1: Resolver operations do NOT mutate stack ordering or size', () => {
    const parent = createEntry('parent', true, 'error', true);
    const child = createEntry('child', false, 'error', false);

    const stack = [parent, child];
    
    expect(stack.length).toBe(2);
    expect(stack[0].policyId).toBe('parent');
    expect(stack[1].policyId).toBe('child');

    composePolicies(stack);

    // Assert stack is unmutated
    expect(stack.length).toBe(2);
    expect(stack[0].policyId).toBe('parent');
    expect(stack[1].policyId).toBe('child');
  });

});
