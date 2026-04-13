import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { PolicyStackEntry } from '../src/policy/types.js';
import { PolicyRuntimeError } from '../src/errors/policyErrors.js';
import * as crypto from 'node:crypto';

describe('Phase 3B: severityLock Activation', () => {

  const createEntry = (id: string, lock: boolean, ruleSeverity: any): PolicyStackEntry => ({
    policyId: id,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      severityLock: lock,
      rules: {
        forbid: [
          { id: 'shared-rule-1', from: 'service-a', to: 'service-b', severity: ruleSeverity }
        ]
      }
    }
  });

  it('Test 1: parent locks severity -> child attempts override -> resolver rejects', () => {
    const parent = createEntry('parent', true, 'error');
    const child = createEntry('child', false, 'warning');

    expect(() => composePolicies([parent, child])).toThrowError(PolicyRuntimeError);
    try {
      composePolicies([parent, child]);
    } catch (err: any) {
      expect(err.code).toBe('SEVERITY_LOCK_VIOLATION');
    }
  });

  it('Test 2: parent locks severity -> child uses same severity -> resolver accepts', () => {
    const parent = createEntry('parent', true, 'error');
    const child = createEntry('child', false, 'error');

    const composed = composePolicies([parent, child]);
    // @ts-ignore
    expect(composed.rules.forbid[0].severity).toBe('error');
  });

});
