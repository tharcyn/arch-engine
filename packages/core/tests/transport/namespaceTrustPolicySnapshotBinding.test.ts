import { describe, it, expect } from 'vitest';
import { computeNamespaceTrustPolicyHash, validateTrustPolicySnapshot } from '../../src/transport/namespaceTrustPolicySnapshotBinding.js';
import { NamespaceTrustPolicy } from '../../src/transport/namespaceTrustPolicy.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.5: namespaceTrustPolicySnapshotBinding', () => {

  it('Test 1: Generates identical hash for identical trust properties natively', () => {
    const a: NamespaceTrustPolicy = { trustedNamespaces: ['b', 'a'], mirrorEquivalenceMap: { 'm': 'n' } };
    const b: NamespaceTrustPolicy = { trustedNamespaces: ['a', 'b'], mirrorEquivalenceMap: { 'm': 'n' } };
    expect(computeNamespaceTrustPolicyHash(a)).toBe(computeNamespaceTrustPolicyHash(b));
  });

  it('Test 2: Rejects mismatched snapshot trust hashes natively', () => {
    try {
      validateTrustPolicySnapshot('snapshot-hash-a', 'runtime-hash-b');
      expect.fail('Should reject');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.TRUST_POLICY_SNAPSHOT_DIVERGENCE);
      expect(e.snapshotTrustPolicyHash).toBe('snapshot-hash-a');
    }
  });

});
