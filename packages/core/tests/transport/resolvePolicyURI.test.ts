import { describe, it, expect } from 'vitest';
import { resolvePolicyURI } from '../../src/transport/resolvePolicyURI.js';

describe('Phase 4: resolvePolicyURI', () => {

  it('Test 1: Parses simple URI', () => {
    const res = resolvePolicyURI('policy://org/security-baseline');
    expect(res.namespace).toBe('org');
    expect(res.policyId).toBe('security-baseline');
    expect(res.versionRange).toBeUndefined();
  });

  it('Test 2: Parses versioned URI', () => {
    const res = resolvePolicyURI('policy://platform/finance-policy@1.4.2');
    expect(res.namespace).toBe('platform');
    expect(res.policyId).toBe('finance-policy');
    expect(res.versionRange).toBe('1.4.2');
  });

  it('Test 3: Parses ranged URI', () => {
    const res = resolvePolicyURI('policy://core/default@^2.0.0');
    expect(res.namespace).toBe('core');
    expect(res.policyId).toBe('default');
    expect(res.versionRange).toBe('^2.0.0');
  });

});
