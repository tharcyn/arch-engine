import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Registry Provenance Validation', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-provenance-test',
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: 'acme.policy.override',
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: true,
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: 'sha256:provenance-test',
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: [],
      ...overrides,
    };
  }

  function makeContext(providers: CapabilityProviderDescriptor[]): CapabilityNegotiationContext {
    return {
      resolvedOverlaySet: [],
      capabilityProviders: providers,
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: false,
    };
  }

  test('provider from unknown registry origin is rejected', () => {
    const provider = makeProvider({
      registryOrigin: 'totally-unknown-registry',
      signatureRoot: 'some-root',
    });

    const result = resolveCapabilityNegotiation(makeContext([provider]));

    expect(result.rejected.length).toBeGreaterThan(0);
    const registryRejection = result.rejected.find(r => r.stage === 'registry' || r.stage === 'signature');
    expect(registryRejection).toBeDefined();
  });

  test('provider from known registry origin passes provenance gate', () => {
    const provider = makeProvider({
      registryOrigin: 'core',
      signatureRoot: 'core.registry.root',
    });

    const result = resolveCapabilityNegotiation(makeContext([provider]));

    const registryRejections = result.rejected.filter(r => r.stage === 'registry');
    expect(registryRejections).toHaveLength(0);
  });

  test('provider from official registry passes provenance gate', () => {
    const provider = makeProvider({
      registryOrigin: 'official',
      registrySource: 'official',
      signatureRoot: 'official.registry.root',
      authorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
    });

    const ctx = makeContext([provider]);
    ctx.authorityContext['official'] = OverlayAuthorityTier.TRUSTED_POLICY_PACK;

    const result = resolveCapabilityNegotiation({
      ...ctx,
      authorityContext: { ...ctx.authorityContext, 'official': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
    });

    const registryRejections = result.rejected.filter(r => r.stage === 'registry');
    expect(registryRejections).toHaveLength(0);
  });
});
