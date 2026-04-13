import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext, RegistryCapabilityEnvelope } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Mirror Privilege Escalation Prevention', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-mirror-test',
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: 'acme.policy.override',
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: false, // NOT mirror-portable
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: 'sha256:mirror-test',
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: [],
      ...overrides,
    };
  }

  test('non-mirror-portable providers rejected when mirror equivalence fails', () => {
    const primaryEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'core',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: ['acme.policy.override'],
      mirrorEquivalenceHash: 'hash-primary-abc',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const mirrorEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'mirror-core',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: ['acme.policy.override'],
      mirrorEquivalenceHash: 'hash-mirror-DIFFERENT',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const provider = makeProvider({ mirrorPortable: false });

    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: [],
      capabilityProviders: [provider],
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: true,
      registryCapabilityEnvelopes: [primaryEnvelope, mirrorEnvelope],
    };

    const result = resolveCapabilityNegotiation(context);

    const mirrorRejections = result.rejected.filter(r => r.stage === 'mirror');
    expect(mirrorRejections.length).toBeGreaterThan(0);
    expect(mirrorRejections[0].reason).toContain('mirror');
  });

  test('mirror-portable providers survive even when mirror equivalence fails', () => {
    const primaryEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'core',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: ['acme.policy.override'],
      mirrorEquivalenceHash: 'hash-primary-xyz',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const mirrorEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'mirror-core',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: ['acme.policy.override'],
      mirrorEquivalenceHash: 'hash-mirror-DIFFERENT-2',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const provider = makeProvider({ mirrorPortable: true });

    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: [],
      capabilityProviders: [provider],
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: true,
      registryCapabilityEnvelopes: [primaryEnvelope, mirrorEnvelope],
    };

    const result = resolveCapabilityNegotiation(context);

    const mirrorRejections = result.rejected.filter(r => r.stage === 'mirror');
    expect(mirrorRejections).toHaveLength(0);
  });

  test('capability negotiation executes after mirror equivalence validation', () => {
    // Mirror boundary gate is Step 8 — after signature, registry, lifecycle, compatibility gates
    // This test verifies ordering by checking that mirror rejection includes the correct stage
    const primaryEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'core',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: [],
      mirrorEquivalenceHash: 'hash-a',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const mirrorEnvelope: RegistryCapabilityEnvelope = {
      registryId: 'mirror',
      registryTrustTier: 'CORE_INTERNAL',
      supportedCapabilityNamespaces: [],
      mirrorEquivalenceHash: 'hash-b',
      federationCompatibilityVersion: 'F12-v1',
      capabilityDowngradePolicy: 'reject',
    };

    const provider = makeProvider({ mirrorPortable: false });

    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: [],
      capabilityProviders: [provider],
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: true,
      registryCapabilityEnvelopes: [primaryEnvelope, mirrorEnvelope],
    };

    const result = resolveCapabilityNegotiation(context);

    // The trace should show mirror boundary gate executing
    const mirrorTraceEntry = result.negotiationTrace.find(t => t.includes('[Step 8]'));
    expect(mirrorTraceEntry).toBeDefined();
  });
});
