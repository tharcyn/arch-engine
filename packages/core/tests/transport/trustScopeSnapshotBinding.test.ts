import { describe, it, expect } from 'vitest';
import { computeNamespaceTrustScopeHash, validateTrustScopeSnapshot } from '../../src/transport/namespaceTrustScopePolicy.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.6: trustScopeSnapshotBinding', () => {

  it('Test 1: Scope hash stability', () => {
    const config1 = {
      scopes: {
        global: { trustedNamespaces: ['b', 'a'] }
      },
      precedence: ['global'] as any
    };
    const config2 = {
      scopes: {
        global: { trustedNamespaces: ['a', 'b'] }
      },
      precedence: ['global'] as any
    };

    const hash1 = computeNamespaceTrustScopeHash(config1);
    const hash2 = computeNamespaceTrustScopeHash(config2);
    expect(hash1).toBe(hash2);
  });

  it('Test 2: Scope snapshot divergence rejection', () => {
    try {
      validateTrustScopeSnapshot('hash1', 'hash2');
      expect.fail('Should reject');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.TRUST_SCOPE_SNAPSHOT_DIVERGENCE);
      expect(e.namespaceTrustScopeHash).toBe('hash1');
    }
  });

});
