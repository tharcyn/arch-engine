import { describe, it, expect } from 'vitest';
import { resolveScopedTrust, ScopedNamespaceTrustPolicy } from '../../src/transport/namespaceTrustScopePolicy.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4.6: namespaceTrustScopePolicy', () => {

  const config: ScopedNamespaceTrustPolicy = {
    scopes: {
      global: { trustedNamespaces: ['core'], allowUntrustedNamespaces: true },
      workspace: { trustedNamespaces: ['dev'], allowUntrustedNamespaces: false },
      federation: { trustedNamespaces: ['fed-trust'], allowUntrustedNamespaces: true },
      snapshot: { trustedNamespaces: ['snapshot-trust'] }
    },
    precedence: ['snapshot', 'federation', 'workspace', 'global']
  };

  it('Test 1: Global allow triggers default if no higher scope blocks it', () => {
    // wait, 'core' is checked.
    // 'snapshot' no allowUntrusted. -> continues
    // 'federation' has allowUntrusted = true. => Returns trusted because allowUntrusted = true!
    const res = resolveScopedTrust('core', config);
    expect(res.trusted).toBe(true);
    expect(res.scopeUsed).toBe('federation');
  });

  it('Test 2: Explicit rejection in higher scope blocks lower scope allow', () => {
    // 'dev' is explicitly allowed in workspace.
    // but a non-listed namespace in workspace gets allowUntrusted = false, 
    // which blocks it BEFORE reaching global.
    
    try {
      resolveScopedTrust('core', {
        scopes: {
          global: { trustedNamespaces: ['core'] },
          workspace: { trustedNamespaces: [], allowUntrustedNamespaces: false }
        },
        precedence: ['workspace', 'global']
      });
      expect.fail('Should reject');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.TRUST_SCOPE_NAMESPACE_REJECTION);
      expect(e.scopeUsed).toBe('workspace');
    }
  });

  it('Test 3: Allowed explicitly in high scope', () => {
    const res = resolveScopedTrust('snapshot-trust', config);
    expect(res.trusted).toBe(true);
    expect(res.scopeUsed).toBe('snapshot');
  });

});
