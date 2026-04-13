import { describe, test, expect } from 'vitest';
import {
  buildCapabilityTrustEnvelope,
  validateTrustEnvelopeCeiling,
} from '../../src/capability/capabilityTrustValidator.js';
import { CapabilityProviderDescriptor } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Trust Envelope Ceiling', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-ceiling-test',
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: 'vendoor.policy.override',
      capabilityVersion: '2.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: true,
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: 'sha256:ceiling-test',
      versionRangeCompat: '^2.0.0',
      seamScopedGrants: [],
      ...overrides,
    };
  }

  test('trust envelope effective tier cannot exceed overlay authority tier', () => {
    const provider = makeProvider({
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
    });

    // Overlay has lower tier than provider claims
    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
      'verified'
    );

    expect(envelope.effectiveAuthorityTier).toBeLessThanOrEqual(
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
    );
  });

  test('validateTrustEnvelopeCeiling rejects envelope exceeding overlay tier', () => {
    // Manually construct an envelope that violates the ceiling
    const badEnvelope = {
      overlaySourceId: 'bad-overlay',
                overlayRegistrySource: 'core',
      registryOrigin: 'core',
      signatureVerificationStatus: 'verified' as const,
      authorityGrantScope: {},
      capabilityGrantSet: [],
      effectiveAuthorityTier: OverlayAuthorityTier.CORE_INTERNAL,
      trustCeiling: OverlayAuthorityTier.CORE_INTERNAL,
    };

    const result = validateTrustEnvelopeCeiling(
      badEnvelope,
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceeds overlay authority tier');
  });

  test('trust ceiling respects registry authority ladder', () => {
    // External registry should cap at SIGNED_EXTERNAL_PACK
    const provider = makeProvider({
      registryOrigin: 'external',
      authorityTier: OverlayAuthorityTier.CORE_INTERNAL,
    });

    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.CORE_INTERNAL,
      'verified'
    );

    // External registry ceiling should cap this
    expect(envelope.effectiveAuthorityTier).toBeLessThanOrEqual(
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
    );
  });

  test('trust envelope is frozen at construction', () => {
    const provider = makeProvider();
    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      'verified'
    );

    expect(Object.isFrozen(envelope)).toBe(true);
  });

  test('valid envelope passes ceiling validation', () => {
    const provider = makeProvider({
      authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
    });

    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      'verified'
    );

    const result = validateTrustEnvelopeCeiling(
      envelope,
      OverlayAuthorityTier.TRUSTED_POLICY_PACK
    );

    expect(result.valid).toBe(true);
  });
});
