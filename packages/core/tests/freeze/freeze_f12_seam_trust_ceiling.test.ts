import { describe, test, expect } from 'vitest';
import {
  buildCapabilityTrustEnvelope,
  validateSeamTrustCeiling,
  validateSeamGrantLatticeConsistency,
} from '../../src/capability/capabilityTrustValidator.js';
import { CapabilityProviderDescriptor, CapabilitySeamAuthorityGrant } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Seam Trust Ceiling', () => {

  function makeProvider(overrides: Partial<CapabilityProviderDescriptor> = {}): CapabilityProviderDescriptor {
    return {
      providerId: 'provider-seam-test',
      registrySource: 'official',
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      capabilityNamespace: 'acme.inventory.restock',
      capabilityVersion: '1.0.0',
      supportedAdapters: [],
      declaredDependencies: [],
      declaredIncompatibilities: [],
      executionPriority: 5,
      mirrorPortable: true,
      signatureRoot: 'official.registry.root',
      registryOrigin: 'official',
      providerIdentityHash: 'sha256:seam-test',
      versionRangeCompat: '^1.0.0',
      seamScopedGrants: ['seam-A', 'seam-B'],
      ...overrides,
    };
  }

  test('capability trust cannot exceed per-seam authority grants', () => {
    const seamGrants: Record<string, CapabilitySeamAuthorityGrant> = {
      'seam-A': {
        seamId: 'seam-A',
        maxCapabilityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
        allowedCapabilityNamespaces: ['acme.inventory.restock'],
      },
      'seam-B': {
        seamId: 'seam-B',
        maxCapabilityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
        allowedCapabilityNamespaces: ['acme.inventory.restock'],
      },
    };

    const provider = makeProvider();
    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      'verified',
      seamGrants
    );

    // seam-A should be capped at SIGNED_EXTERNAL_PACK (min of ceiling and seam grant)
    // seam-B should be capped at UNTRUSTED_EXTERNAL
    const result = validateSeamTrustCeiling(envelope, seamGrants);
    expect(result.valid).toBe(true);

    // Verify per-seam tiers are properly capped
    expect(envelope.authorityGrantScope['seam-A']).toBeLessThanOrEqual(
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
    );
    expect(envelope.authorityGrantScope['seam-B']).toBeLessThanOrEqual(
      OverlayAuthorityTier.UNTRUSTED_EXTERNAL
    );
  });

  test('overlay may be Tier-3 for seam A but Tier-1 for seam B without global escalation', () => {
    const seamGrants: Record<string, CapabilitySeamAuthorityGrant> = {
      'seam-A': {
        seamId: 'seam-A',
        maxCapabilityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
        allowedCapabilityNamespaces: ['acme.policy.override'],
      },
      'seam-B': {
        seamId: 'seam-B',
        maxCapabilityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
        allowedCapabilityNamespaces: ['acme.policy.override'],
      },
    };

    const provider = makeProvider({
      authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
    });

    const envelope = buildCapabilityTrustEnvelope(
      provider,
      OverlayAuthorityTier.TRUSTED_POLICY_PACK,
      'verified',
      seamGrants
    );

    // Seam A can be higher than seam B without contamination
    const seamATier = envelope.authorityGrantScope['seam-A'];
    const seamBTier = envelope.authorityGrantScope['seam-B'];

    expect(seamATier).toBeGreaterThan(seamBTier);
    // But both are within their respective grants
    expect(seamATier).toBeLessThanOrEqual(OverlayAuthorityTier.TRUSTED_POLICY_PACK);
    expect(seamBTier).toBeLessThanOrEqual(OverlayAuthorityTier.UNTRUSTED_EXTERNAL);
  });

  test('seam-grant lattice rejects grants exceeding overlay authority tier', () => {
    const seamGrants: Record<string, CapabilitySeamAuthorityGrant> = {
      'seam-escalation': {
        seamId: 'seam-escalation',
        maxCapabilityTier: OverlayAuthorityTier.CORE_INTERNAL,
        allowedCapabilityNamespaces: ['acme.policy.override'],
      },
    };

    const result = validateSeamGrantLatticeConsistency(
      seamGrants,
      OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
      'official'
    );

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain('exceeds overlay authority tier');
  });

  test('seam-grant lattice rejects grants exceeding registry ceiling', () => {
    const seamGrants: Record<string, CapabilitySeamAuthorityGrant> = {
      'seam-registry-breach': {
        seamId: 'seam-registry-breach',
        maxCapabilityTier: OverlayAuthorityTier.CORE_INTERNAL,
        allowedCapabilityNamespaces: [],
      },
    };

    // External registry has ceiling at SIGNED_EXTERNAL_PACK
    const result = validateSeamGrantLatticeConsistency(
      seamGrants,
      OverlayAuthorityTier.CORE_INTERNAL,
      'external'
    );

    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('exceeds registry ceiling'))).toBe(true);
  });
});
