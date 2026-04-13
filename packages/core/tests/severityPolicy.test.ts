import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { PolicyStackEntry } from '../src/policy/types.js';
import * as crypto from 'node:crypto';

describe('Phase 3B: severityPolicy Activation', () => {

  const createEntry = (id: string, policyMode: any, ruleSeverity: any): PolicyStackEntry => ({
    policyId: id,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      severityPolicy: policyMode,
      rules: {
        forbid: [
          { id: '1', from: 'service-a', to: 'service-b', severity: ruleSeverity }
        ]
      }
    }
  });

  it('Test 1: severityPolicy strict -> downgrade attempt blocked', () => {
    const parent = createEntry('parent', 'strict', 'error');
    const child = createEntry('child', 'strict', 'warning');

    const composed = composePolicies([parent, child]);
    // @ts-ignore
    expect(composed.rules.forbid[0].severity).toBe('error');
  });

  it('Test 2: severityPolicy permissive -> downgrade allowed', () => {
    const parent = createEntry('parent', 'permissive', 'error');
    const child = createEntry('child', 'strict', 'warning');

    const composed = composePolicies([parent, child]);
    // @ts-ignore
    expect(composed.rules.forbid[0].severity).toBe('warning');
  });

  it('Test 3: severityPolicy override -> incoming replaces existing', () => {
    const parent = createEntry('parent', 'override', 'error');
    const child = createEntry('child', 'strict', 'notice');

    const composed = composePolicies([parent, child]);
    // @ts-ignore
    expect(composed.rules.forbid[0].severity).toBe('notice');
  });

});
