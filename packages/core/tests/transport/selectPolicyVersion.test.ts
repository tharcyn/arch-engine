import { describe, it, expect } from 'vitest';
import { selectPolicyVersion } from '../../src/transport/selectPolicyVersion.js';

describe('Phase 4: selectPolicyVersion', () => {

  it('Test 1: Selects highest available if no lockfile', () => {
    const res = selectPolicyVersion('ns', 'id', ['1.0.0', '2.0.0', '3.0.0']);
    expect(res).toBe('3.0.0');
  });

  it('Test 2: Lockfile overrides other candidates', () => {
    const lockfiles = [{ namespace: 'ns', id: 'id', lockedVersion: '2.5.0' }];
    // Even if 2.5.0 is in available versions, mock needs it there
    const res = selectPolicyVersion('ns', 'id', ['1.0.0', '2.5.0', '3.0.0'], undefined, lockfiles);
    expect(res).toBe('2.5.0');
  });

});
