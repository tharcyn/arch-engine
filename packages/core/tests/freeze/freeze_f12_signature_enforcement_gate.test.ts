import { describe, test, expect } from 'vitest';
import { validateCapabilitySignatureRoot } from '../../src/capability/capabilityTrustValidator.js';
import { CapabilityProviderDescriptor } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Signature Enforcement Gate', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-sig-test',
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: 'vendoor.policy.override',
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: true,
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: 'sha256:sig-test',
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: [],
      ...overrides,
    };
  }

  test('unsigned overlay MUST NOT publish signed-tier capability providers', () => {
    const provider = makeProvider({
      signatureRoot: '', // No signature
      authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(false);
    expect(result.mode).toBe('missing');
    expect(result.reason).toContain('unsigned overlays MUST NOT publish signed-tier');
  });

  test('unsigned overlay MUST NOT publish TRUSTED_POLICY_PACK providers', () => {
    const provider = makeProvider({
      signatureRoot: '',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(false);
    expect(result.mode).toBe('missing');
  });

  test('unsigned overlay MUST NOT publish CORE_INTERNAL providers', () => {
    const provider = makeProvider({
      signatureRoot: '',
      authorityTier: OverlayAuthorityTier.CORE_INTERNAL,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(false);
    expect(result.mode).toBe('missing');
  });

  test('unsigned UNTRUSTED_EXTERNAL provider is allowed without signature', () => {
    const provider = makeProvider({
      signatureRoot: '',
      authorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(true);
    expect(result.mode).toBe('missing');
  });

  test('signed provider with valid trust root passes gate', () => {
    const provider = makeProvider({
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(true);
    expect(result.mode).toBe('verified');
  });

  test('provider referencing unknown registry origin fails trust root resolution', () => {
    const provider = makeProvider({
      signatureRoot: 'unknown-root',
      registryOrigin: 'nonexistent-registry',
      authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(false);
    expect(result.mode).toBe('untrusted-root');
    expect(result.reason).toContain('no active trust root');
  });

  test('provider authority exceeding registry ceiling is rejected', () => {
    // External registry ceiling is SIGNED_EXTERNAL_PACK
    const provider = makeProvider({
      signatureRoot: 'external.registry.root',
      registryOrigin: 'external',
      authorityTier: OverlayAuthorityTier.CORE_INTERNAL,
    });

    const result = validateCapabilitySignatureRoot(provider);
    expect(result.verified).toBe(false);
    expect(result.mode).toBe('invalid');
    expect(result.reason).toContain('registry ceiling');
  });
});
