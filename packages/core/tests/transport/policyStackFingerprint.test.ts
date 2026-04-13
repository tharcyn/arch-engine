import { describe, it, expect } from 'vitest';
import { computePolicyStackFingerprint } from '../../src/transport/policyStackFingerprint.js';

describe('Phase 4.9: PolicyStackFingerprint', () => {

  it('Test 1: Identical inputs produce identical fingerprints', () => {
    const a = computePolicyStackFingerprint('closure1', 'scope1', 'trust1');
    const b = computePolicyStackFingerprint('closure1', 'scope1', 'trust1');
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('Test 2: Different closure hash produces different fingerprint', () => {
    const a = computePolicyStackFingerprint('closureA', 'scope1', 'trust1');
    const b = computePolicyStackFingerprint('closureB', 'scope1', 'trust1');
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('Test 3: Different trust hash produces different fingerprint', () => {
    const a = computePolicyStackFingerprint('closure1', 'scope1', 'trustA');
    const b = computePolicyStackFingerprint('closure1', 'scope1', 'trustB');
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('Test 4: Different scope hash produces different fingerprint', () => {
    const a = computePolicyStackFingerprint('closure1', 'scopeA', 'trust1');
    const b = computePolicyStackFingerprint('closure1', 'scopeB', 'trust1');
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('Test 5: Fingerprint version is v1', () => {
    const fp = computePolicyStackFingerprint('c', 's', 't');
    expect(fp.fingerprintVersion).toBe('v1');
  });
});
