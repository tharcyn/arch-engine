import { describe, it, expect } from 'vitest';
import { enforceMirrorEquivalence, NamespaceTrustPolicy } from '../../src/transport/namespaceTrustPolicy.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4: mirrorNamespaceEquivalence', () => {

  it('Test 1: Mirror matches hash passes', () => {
    const policy: NamespaceTrustPolicy = { 
      trustedNamespaces: ['core'],
      mirrorEquivalenceMap: { 'core': 'mirror-core' }
    };
    expect(() => enforceMirrorEquivalence('core', 'mirror-core', 'hash1', 'hash1', policy)).not.toThrow();
  });

  it('Test 2: Mirror mismatch throws', () => {
    const policy: NamespaceTrustPolicy = { 
      trustedNamespaces: ['core'],
      mirrorEquivalenceMap: { 'core': 'mirror-core' }
    };
    try {
      enforceMirrorEquivalence('core', 'mirror-core', 'hash1', 'hash2', policy);
      expect.fail('Should have thrown mirror divergence error');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.MIRROR_NAMESPACE_DIVERGENCE);
      expect(e.mirrorNamespace).toBe('mirror-core');
      expect(e.loaderStageMetadata.validationStage).toBe('enforceMirrorEquivalence');
    }
  });

});
