import { describe, it, expect } from 'vitest';
import { enforceNamespaceTrust, NamespaceTrustPolicy } from '../../src/transport/namespaceTrustPolicy.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4: namespaceTrustPolicy', () => {

  it('Test 1: Trusted namespace passes', () => {
    const policy: NamespaceTrustPolicy = { trustedNamespaces: ['core', 'security'] };
    expect(() => enforceNamespaceTrust('core', policy)).not.toThrow();
  });

  it('Test 2: Untrusted namespace throws', () => {
    const policy: NamespaceTrustPolicy = { trustedNamespaces: ['core'], allowUntrustedNamespaces: false };
    try {
      enforceNamespaceTrust('untrusted', policy);
      expect.fail('Should have thrown untrusted error');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.UNTRUSTED_NAMESPACE_REJECTION);
      expect(e.policyNamespace).toBe('untrusted');
      expect(e.loaderStageMetadata.validationStage).toBe('enforceNamespaceTrust');
    }
  });

  it('Test 3: Untrusted namespace passes if allowUntrustedNamespaces is true', () => {
    const policy: NamespaceTrustPolicy = { trustedNamespaces: ['core'], allowUntrustedNamespaces: true };
    expect(() => enforceNamespaceTrust('untrusted', policy)).not.toThrow();
  });

});
