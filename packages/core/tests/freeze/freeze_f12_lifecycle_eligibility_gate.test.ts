import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze F-12: Lifecycle Eligibility Gate', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-lifecycle-test',
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
      providerIdentityHash: 'sha256:lifecycle-test',
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

  test('REVOKED overlay provider is rejected by lifecycle gate', () => {
    const providerId = 'revoked-lifecycle-provider';

    // Register as SUBMITTED first, then transition to ADMITTED, then ACTIVE, then REVOKED
    setOverlayLifecycleState({
      overlaySourceId: providerId,
      overlayVersion: '1.0.0',
      registryId: 'core',
      lifecycleState: OverlayLifecycleState.SUBMITTED,
    });
    setOverlayLifecycleState({
      overlaySourceId: providerId,
      overlayVersion: '1.0.0',
      registryId: 'core',
      lifecycleState: OverlayLifecycleState.ADMITTED,
    });
    setOverlayLifecycleState({
      overlaySourceId: providerId,
      overlayVersion: '1.0.0',
      registryId: 'core',
      lifecycleState: OverlayLifecycleState.ACTIVE,
    });
    setOverlayLifecycleState({
      overlaySourceId: providerId,
      overlayVersion: '1.0.0',
      registryId: 'core',
      lifecycleState: OverlayLifecycleState.REVOKED,
    });

    const provider = makeProvider({ providerId });
    const result = resolveCapabilityNegotiation(makeContext([provider]));

    const lifecycleRejection = result.rejected.find(r => r.stage === 'lifecycle');
    expect(lifecycleRejection).toBeDefined();
    expect(lifecycleRejection!.reason).toContain('revoked');
  });

  test('unmanaged overlay provider passes lifecycle gate (defaults to ACTIVE)', () => {
    const provider = makeProvider({
      providerId: 'unmanaged-lifecycle-provider-' + Date.now(),
    });

    const result = resolveCapabilityNegotiation(makeContext([provider]));

    const lifecycleRejections = result.rejected.filter(r => r.stage === 'lifecycle');
    expect(lifecycleRejections).toHaveLength(0);
  });
});
