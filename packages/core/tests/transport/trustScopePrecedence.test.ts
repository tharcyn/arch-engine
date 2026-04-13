import { describe, it, expect } from 'vitest';
import { resolveScopedTrust, ScopedNamespaceTrustPolicy } from '../../src/transport/namespaceTrustScopePolicy.js';

describe('Phase 4.6: trustScopePrecedence', () => {

  it('Test 1: Global allow, workspace override', () => {
    const config: ScopedNamespaceTrustPolicy = {
      scopes: {
        global: { trustedNamespaces: ['core'] },
        // workspace overrides by failing all unknown
        workspace: { trustedNamespaces: [], allowUntrustedNamespaces: false }
      },
      precedence: ['workspace', 'global']
    };
    
    // Core should fail because workspace rejects it first
    try {
      resolveScopedTrust('core', config);
      expect.fail('Should reject');
    } catch (e: any) {
      expect(e.scopeUsed).toBe('workspace');
    }
  });

  it('Test 2: Empty scopes correctly defaults to REJECT (Phase 4.8 deny-by-default)', () => {
    const config: ScopedNamespaceTrustPolicy = {
      scopes: {}
    };
    // Phase 4.8: Empty scopes now defaults to REJECT (audit finding H14)
    try {
      resolveScopedTrust('core', config);
      expect.fail('Should reject — deny-by-default');
    } catch (e: any) {
      expect(e.code).toBe('TRUST_SCOPE_NAMESPACE_REJECTION');
    }
  });

  it('Test 3: Explicit global allow still works', () => {
    const config: ScopedNamespaceTrustPolicy = {
      scopes: {
        global: { trustedNamespaces: ['core'], allowUntrustedNamespaces: true }
      },
      precedence: ['global']
    };
    const res = resolveScopedTrust('core', config);
    expect(res.trusted).toBe(true);
    expect(res.scopeUsed).toBe('global');
  });

});
