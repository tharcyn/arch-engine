/**
 * F-12: Capability Negotiation Federation Types
 *
 * Canonical type contracts for cross-registry overlay capability interoperability.
 *
 * IDENTITY SAFETY CONTRACT:
 * All types defined here describe execution metadata only.
 * They MUST NOT participate in:
 *   - snapshotClosureGraphHash
 *   - policyStackFingerprint
 *   - closureProvenance construction
 *   - overlay resolution ordering
 *   - lifecycle admission ordering
 *   - compatibility matrix evaluation ordering
 *
 * FEDERATION PROTOCOL VERSION:
 * Declared as a literal constant for cross-registry compatibility negotiation.
 */

import { OverlayAuthorityTier } from '../topology/seamContracts.js';
import { RegistryTrustTier } from '../topology/registryTrustStore.js';

export const CAPABILITY_NEGOTIATION_PROTOCOL_VERSION = 'F12-v1';

// ═══════════════════════════════════════════════════════════
// 1. Capability Manifest Contract
// ═══════════════════════════════════════════════════════════

export interface CapabilityManifest {
  readonly manifestId: string;
  readonly manifestVersion: string;
  readonly overlaySourceId: string;
  readonly registryOrigin: string;
  readonly providers: readonly CapabilityProviderDescriptor[];
  readonly requirements: readonly CapabilityRequirementDescriptor[];
  readonly signatureRoot: string;
  readonly authorityGrants: Readonly<Record<string, CapabilitySeamAuthorityGrant>>;
  readonly negotiationProtocolVersion: string;
}

// ═══════════════════════════════════════════════════════════
// 2. Capability Provider Descriptor (federation-upgraded)
// ═══════════════════════════════════════════════════════════

export interface CapabilityProviderDescriptor {
  // ── Core identity ──────────────────────────────────────
  readonly providerId: string;
  readonly registrySource: string;
  readonly authorityTier: OverlayAuthorityTier;
  readonly capabilityNamespace: string;
  readonly capabilityVersion: string;
  readonly supportedAdapters: readonly string[];
  readonly declaredDependencies: readonly string[];
  readonly declaredIncompatibilities: readonly string[];
  readonly executionPriority: number;
  readonly mirrorPortable: boolean;
  // ── F-12 federation identity fields ────────────────────
  readonly signatureRoot: string;
  readonly registryOrigin: string;
  readonly providerIdentityHash: string;
  readonly versionRangeCompat: string;
  readonly seamScopedGrants: readonly string[];
  // ── F-12 refinement: registry trust tier for tie-breaking ─
  readonly registryTrustTier?: RegistryTrustTier;
}

// ═══════════════════════════════════════════════════════════
// 3. Capability Requirement Descriptor (federation-upgraded)
// ═══════════════════════════════════════════════════════════

export interface CapabilityRequirementDescriptor {
  readonly requiredNamespace: string;
  readonly requiredVersionRange: string;
  readonly requiredFeatures: readonly string[];
  readonly optionalFeatures: readonly string[];
  readonly incompatibleProviders: readonly string[];
  readonly authorityFloor: OverlayAuthorityTier;
}

// ═══════════════════════════════════════════════════════════
// 4. Capability Trust Envelope
// ═══════════════════════════════════════════════════════════

export interface CapabilityTrustEnvelope {
  readonly overlaySourceId: string;
  readonly registryOrigin: string;
  readonly signatureVerificationStatus: 'verified' | 'missing' | 'invalid' | 'untrusted-root';
  readonly authorityGrantScope: Readonly<Record<string, OverlayAuthorityTier>>;
  readonly capabilityGrantSet: readonly string[];
  readonly effectiveAuthorityTier: OverlayAuthorityTier;
  readonly trustCeiling: OverlayAuthorityTier;
}

// ═══════════════════════════════════════════════════════════
// 5. Capability Seam Authority Grant
// ═══════════════════════════════════════════════════════════

export interface CapabilitySeamAuthorityGrant {
  readonly seamId: string;
  readonly maxCapabilityTier: OverlayAuthorityTier;
  readonly allowedCapabilityNamespaces: readonly string[];
}

// ═══════════════════════════════════════════════════════════
// 6. Registry Capability Envelope
// ═══════════════════════════════════════════════════════════

export interface RegistryCapabilityEnvelope {
  readonly registryId: string;
  readonly registryTrustTier: RegistryTrustTier;
  readonly supportedCapabilityNamespaces: readonly string[];
  readonly mirrorEquivalenceHash: string;
  readonly federationCompatibilityVersion: string;
  readonly capabilityDowngradePolicy: 'reject' | 'downgrade' | 'warn';
}

// ═══════════════════════════════════════════════════════════
// 7. Capability Negotiation Context
// ═══════════════════════════════════════════════════════════

export interface CapabilityNegotiationContext {
  readonly resolvedOverlaySet: readonly string[];
  readonly capabilityProviders: readonly CapabilityProviderDescriptor[];
  readonly requestedCapabilities: readonly CapabilityRequirementDescriptor[];
  readonly authorityContext: Readonly<Record<string, OverlayAuthorityTier>>;
  readonly registryTrustDomain: RegistryTrustTier;
  readonly executionStrategy: string;
  readonly mirrorEquivalenceMode: boolean;
  readonly activeSeamIds?: readonly string[];
  readonly registryCapabilityEnvelopes?: readonly RegistryCapabilityEnvelope[];
}

// ═══════════════════════════════════════════════════════════
// 8. Capability Negotiation Decision
// ═══════════════════════════════════════════════════════════

export interface CapabilityNegotiationRejection {
  readonly providerId: string;
  readonly reason: string;
  readonly stage: 'signature' | 'authority' | 'registry' | 'lifecycle' | 'compatibility' | 'mirror' | 'seam-scope';
}

export interface CapabilityNegotiationDecision {
  readonly eligible: readonly CapabilityProviderDescriptor[];
  readonly selected: readonly CapabilityProviderDescriptor[];
  readonly rejected: readonly CapabilityNegotiationRejection[];
  readonly trustEnvelopes: ReadonlyMap<string, CapabilityTrustEnvelope>;
  readonly dependencyClosure: readonly string[];
  readonly negotiationTrace: readonly string[];
  readonly deterministic: true;
  readonly decisionStructureHash: string;
  readonly decisionTraceHash: string;
  readonly protocolVersion: string;
}

// ═══════════════════════════════════════════════════════════
// 9. Capability Descriptor Matrix Schema Versions
// ═══════════════════════════════════════════════════════════

export const CAPABILITY_MANIFEST_SCHEMA_VERSION = 1;
export const CAPABILITY_PROVIDER_DESCRIPTOR_SCHEMA_VERSION = 1;
export const CAPABILITY_TRUST_ENVELOPE_SCHEMA_VERSION = 1;
export const REGISTRY_CAPABILITY_ENVELOPE_SCHEMA_VERSION = 1;

export const CAPABILITY_FEDERATION_DESCRIPTOR = {
  capabilityManifestSchemaVersion: CAPABILITY_MANIFEST_SCHEMA_VERSION,
  capabilityProviderDescriptorSchemaVersion: CAPABILITY_PROVIDER_DESCRIPTOR_SCHEMA_VERSION,
  capabilityTrustEnvelopeSchemaVersion: CAPABILITY_TRUST_ENVELOPE_SCHEMA_VERSION,
  registryCapabilityEnvelopeSchemaVersion: REGISTRY_CAPABILITY_ENVELOPE_SCHEMA_VERSION,
  version: 1
} as const;
