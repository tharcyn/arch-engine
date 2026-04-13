import { describe, test, expect } from 'vitest';
import {
  CapabilityManifest,
  CapabilityProviderDescriptor,
  CapabilityRequirementDescriptor,
  CapabilitySeamAuthorityGrant,
  CAPABILITY_NEGOTIATION_PROTOCOL_VERSION,
  CAPABILITY_FEDERATION_DESCRIPTOR,
} from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Capability Manifest Contract', () => {

  const validProvider: CapabilityProviderDescriptor = {
    providerId: 'test-provider-alpha',
    registrySource: 'core',
    authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
    capabilityNamespace: 'acme.inventory.restock',
    capabilityVersion: '1.2.0',
    supportedAdapters: ['laravel'],
    declaredDependencies: [],
    declaredIncompatibilities: [],
    executionPriority: 10,
    mirrorPortable: true,
    signatureRoot: 'core.registry.root',
    registryOrigin: 'core',
    providerIdentityHash: 'sha256:abc123',
    versionRangeCompat: '^1.0.0',
    seamScopedGrants: ['overlay::topology::resolution'],
  };

  test('CapabilityProviderDescriptor requires all F-12 federation identity fields', () => {
    expect(validProvider.signatureRoot).toBe('core.registry.root');
    expect(validProvider.registryOrigin).toBe('core');
    expect(validProvider.providerIdentityHash).toBe('sha256:abc123');
    expect(validProvider.versionRangeCompat).toBe('^1.0.0');
    expect(validProvider.seamScopedGrants).toEqual(['overlay::topology::resolution']);
  });

  test('CapabilityManifest binds providers to overlay and registry identity', () => {
    const manifest: CapabilityManifest = {
      manifestId: 'manifest-001',
      manifestVersion: '1.0.0',
      overlaySourceId: 'overlay-alpha',
                overlayRegistrySource: 'core',
      registryOrigin: 'core',
      providers: [validProvider],
      requirements: [],
      signatureRoot: 'core.registry.root',
      authorityGrants: {},
      negotiationProtocolVersion: CAPABILITY_NEGOTIATION_PROTOCOL_VERSION,
    };

    expect(manifest.overlaySourceId).toBe('overlay-alpha');
    expect(manifest.registryOrigin).toBe('core');
    expect(manifest.providers).toHaveLength(1);
    expect(manifest.negotiationProtocolVersion).toBe('F12-v1');
  });

  test('CapabilitySeamAuthorityGrant restricts per-seam capability namespaces', () => {
    const grant: CapabilitySeamAuthorityGrant = {
      seamId: 'overlay::topology::resolution',
      maxCapabilityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
      allowedCapabilityNamespaces: ['acme.inventory.restock'],
    };

    expect(grant.maxCapabilityTier).toBe(OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
    expect(grant.allowedCapabilityNamespaces).toContain('acme.inventory.restock');
  });

  test('CAPABILITY_FEDERATION_DESCRIPTOR contains all required schema versions', () => {
    expect(CAPABILITY_FEDERATION_DESCRIPTOR.capabilityManifestSchemaVersion).toBeTypeOf('number');
    expect(CAPABILITY_FEDERATION_DESCRIPTOR.capabilityProviderDescriptorSchemaVersion).toBeTypeOf('number');
    expect(CAPABILITY_FEDERATION_DESCRIPTOR.capabilityTrustEnvelopeSchemaVersion).toBeTypeOf('number');
    expect(CAPABILITY_FEDERATION_DESCRIPTOR.registryCapabilityEnvelopeSchemaVersion).toBeTypeOf('number');
    expect(CAPABILITY_FEDERATION_DESCRIPTOR.version).toBeTypeOf('number');
  });

  test('CAPABILITY_NEGOTIATION_PROTOCOL_VERSION is F12-v1', () => {
    expect(CAPABILITY_NEGOTIATION_PROTOCOL_VERSION).toBe('F12-v1');
  });

  test('CapabilityRequirementDescriptor enforces authority floor', () => {
    const requirement: CapabilityRequirementDescriptor = {
      requiredNamespace: 'acme.inventory.restock',
      requiredVersionRange: '^1.0.0',
      requiredFeatures: ['batch-restock'],
      optionalFeatures: ['audit-trail'],
      incompatibleProviders: ['legacy-provider'],
      authorityFloor: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
    };

    expect(requirement.authorityFloor).toBe(OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
    expect(requirement.incompatibleProviders).toContain('legacy-provider');
  });

  test('provider namespace uses registry-scoped canonical form', () => {
    // Refinement #2: namespace canonicalization
    expect(validProvider.capabilityNamespace).toContain('.');
    expect(validProvider.capabilityNamespace).not.toBe('restock');
    expect(validProvider.capabilityNamespace).toBe('acme.inventory.restock');
  });
});
