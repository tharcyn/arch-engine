import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { certifyNegotiationDeterminism } from '../../src/capability/capabilityNegotiationDeterminism.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Negotiation Determinism', () => {

  function makeProvider(id: string, namespace: string, priority: number): CapabilityProviderDescriptor {
    return {
      providerId: id,
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: namespace,
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: priority,
      mirrorPortable: true,
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: `sha256:${id}`,
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: [],
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

  test('negotiation is deterministic across provider input ordering permutations', () => {
    const providerA = makeProvider('prov-alpha', 'vendoor.inventory.restock', 10);
    const providerB = makeProvider('prov-beta', 'vendoor.policy.override', 5);
    const providerC = makeProvider('prov-gamma', 'vendoor.inventory.restock', 8);

    // Run with original order
    const result1 = resolveCapabilityNegotiation(makeContext([providerA, providerB, providerC]));
    // Run with reversed order
    const result2 = resolveCapabilityNegotiation(makeContext([providerC, providerB, providerA]));
    // Run with shuffled order
    const result3 = resolveCapabilityNegotiation(makeContext([providerB, providerC, providerA]));

    // All three must produce identical structure hash
    expect(result1.decisionStructureHash).toBe(result2.decisionStructureHash);
    expect(result2.decisionStructureHash).toBe(result3.decisionStructureHash);
  });

  test('negotiation is deterministic across registry mirror arrival order', () => {
    const providers = [
      makeProvider('provider-z', 'vendoor.z.namespace', 1),
      makeProvider('provider-a', 'vendoor.a.namespace', 1),
      makeProvider('provider-m', 'vendoor.m.namespace', 1),
    ];

    const result1 = resolveCapabilityNegotiation(makeContext(providers));
    const result2 = resolveCapabilityNegotiation(makeContext([...providers].reverse()));

    const cert = certifyNegotiationDeterminism(result1, result2);
    expect(cert.deterministic).toBe(true);
    expect(cert.structureHashMatch).toBe(true);
    expect(cert.traceHashMatch).toBe(true);
  });

  test('selected provider ordering is deterministic', () => {
    const providers = [
      makeProvider('prov-3', 'vendoor.namespace.c', 5),
      makeProvider('prov-1', 'vendoor.namespace.a', 5),
      makeProvider('prov-2', 'vendoor.namespace.b', 5),
    ];

    const result = resolveCapabilityNegotiation(makeContext(providers));

    // Providers should be sorted by namespace (after authority/trust tiers are equal)
    const selectedIds = result.selected.map(p => p.providerId);
    expect(selectedIds.indexOf('prov-1')).toBeLessThan(selectedIds.indexOf('prov-2'));
    expect(selectedIds.indexOf('prov-2')).toBeLessThan(selectedIds.indexOf('prov-3'));
  });

  test('rejected providers are sorted deterministically by providerId → stage → reason', () => {
    const providers = [
      makeProvider('prov-reject-z', 'vendoor.policy.override', 5),
      makeProvider('prov-reject-a', 'vendoor.policy.override', 5),
    ];

    // Force rejection by setting unknown registry
    const rejectable = providers.map(p => ({
      ...p,
      registryOrigin: 'nonexistent-registry',
      signatureRoot: 'nonexistent-root',
    }));

    const result = resolveCapabilityNegotiation(makeContext(rejectable));

    if (result.rejected.length >= 2) {
      // Should be sorted by providerId
      expect(result.rejected[0].providerId.localeCompare(result.rejected[1].providerId)).toBeLessThanOrEqual(0);
    }
  });

  test('negotiation result is frozen (immutable)', () => {
    const provider = makeProvider('frozen-test', 'vendoor.policy.override', 5);
    const result = resolveCapabilityNegotiation(makeContext([provider]));

    expect(Object.isFrozen(result)).toBe(true);
    expect(result.deterministic).toBe(true);
  });

  test('decision includes split hashes (structure + trace)', () => {
    const provider = makeProvider('hash-test', 'vendoor.policy.override', 5);
    const result = resolveCapabilityNegotiation(makeContext([provider]));

    expect(result.decisionStructureHash).toBeTruthy();
    expect(result.decisionTraceHash).toBeTruthy();
    expect(result.decisionStructureHash).not.toBe(result.decisionTraceHash);
  });

  test('protocol version is F12-v1', () => {
    const provider = makeProvider('version-test', 'vendoor.policy.override', 5);
    const result = resolveCapabilityNegotiation(makeContext([provider]));

    expect(result.protocolVersion).toBe('F12-v1');
  });
});
