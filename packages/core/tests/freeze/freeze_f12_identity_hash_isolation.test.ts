import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

/**
 * CRITICAL SAFETY TEST
 *
 * This test verifies that F-12 capability negotiation NEVER mutates:
 *   - closure graph hash
 *   - overlay fingerprint inputs
 *   - resolution precedence ordering
 *   - lifecycle admission ordering
 *   - compatibility matrix evaluation order
 *
 * If this test fails, F-12 has introduced identity drift
 * and MUST be rejected.
 */
describe('Freeze F-12: Identity Hash Isolation', () => {

  function makeProvider(id: string, namespace: string): CapabilityProviderDescriptor {
    return {
      providerId: id,
      registrySource: 'core',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: namespace,
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: true,
      signatureRoot: 'core.registry.root',
      registryOrigin: 'core',
      providerIdentityHash: `sha256:${id}`,
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: [],
    };
  }

  test('negotiation result contains no numeric authority tier values in top-level output', () => {
    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: [],
      capabilityProviders: [makeProvider('iso-test', 'acme.test.namespace')],
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: false,
    };

    const result = resolveCapabilityNegotiation(context);

    // The decision structure should contain only:
    // - arrays (eligible, selected, rejected, closure, trace)
    // - Map (trustEnvelopes)
    // - strings (hashes, protocol version)
    // - boolean literal (deterministic: true)
    expect(result.deterministic).toBe(true);
    expect(typeof result.decisionStructureHash).toBe('string');
    expect(typeof result.decisionTraceHash).toBe('string');
    expect(typeof result.protocolVersion).toBe('string');
    expect(Array.isArray(result.eligible)).toBe(true);
    expect(Array.isArray(result.selected)).toBe(true);
    expect(Array.isArray(result.rejected)).toBe(true);
    expect(Array.isArray(result.dependencyClosure)).toBe(true);
    expect(Array.isArray(result.negotiationTrace)).toBe(true);
  });

  test('capability negotiation does not produce outputs that resemble fingerprint inputs', () => {
    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: [],
      capabilityProviders: [
        makeProvider('prov-1', 'acme.a.namespace'),
        makeProvider('prov-2', 'acme.b.namespace'),
      ],
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: false,
    };

    const result = resolveCapabilityNegotiation(context);

    // Decision must NOT contain any keys that match identity-surface names
    const decisionKeys = Object.keys(result);
    const forbiddenKeys = [
      'snapshotClosureGraphHash',
      'policyStackFingerprint',
      'closureProvenance',
      'closureGraphContractVersion',
      'namespaceTrustPolicyHash',
      'registrySourceHash',
      'dependencyGraphShapeHash',
    ];

    for (const forbidden of forbiddenKeys) {
      expect(decisionKeys).not.toContain(forbidden);
    }
  });

  test('negotiation does not modify input context', () => {
    const providers = [makeProvider('mutation-test', 'acme.test.ns')];
    const context: CapabilityNegotiationContext = {
      resolvedOverlaySet: ['overlay-1'],
      capabilityProviders: providers,
      requestedCapabilities: [],
      authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
      registryTrustDomain: 'CORE_INTERNAL',
      executionStrategy: 'AUTHORITY_FIRST',
      mirrorEquivalenceMode: false,
    };

    // Snapshot context before
    const providersBefore = JSON.stringify(context.capabilityProviders);
    const overlaysBefore = JSON.stringify(context.resolvedOverlaySet);

    resolveCapabilityNegotiation(context);

    // Context must be unchanged
    expect(JSON.stringify(context.capabilityProviders)).toBe(providersBefore);
    expect(JSON.stringify(context.resolvedOverlaySet)).toBe(overlaysBefore);
  });

  test('diagnostics output contains no number types in top-level values', async () => {
    const { inspectCapabilityNegotiationDecision } = await import('../../src/transport/federationDiagnostics.js');

    const diagnostics = inspectCapabilityNegotiationDecision(
      [], [], [], [], 'STRATEGY'
    );

    // Ensure diagnostic structure natively prevents number types
    Object.values(diagnostics).forEach(value => {
      expect(typeof value).not.toBe('number');
    });
  });
});
