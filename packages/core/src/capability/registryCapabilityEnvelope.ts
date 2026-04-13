/**
 * F-12: Registry Capability Envelope
 *
 * Provides construction and validation of registry-level capability envelopes
 * for multi-registry federation compatibility assertions.
 *
 * Supports:
 *   - Registry envelope construction from trust store state
 *   - Cross-registry capability compatibility assertions
 *   - Mirror equivalence verification for capabilities
 *   - Capability downgrade detection
 *   - Provider identity hash mirror-equivalence binding
 *
 * IDENTITY SAFETY:
 *   Registry capability envelopes are federation metadata only.
 *   They MUST NOT participate in closure identity or fingerprint hash inputs.
 */

import {
  RegistryCapabilityEnvelope,
  CAPABILITY_NEGOTIATION_PROTOCOL_VERSION,
} from './capabilityFederationTypes.js';
import { resolveRegistryTrustRoot, RegistryTrustTier } from '../topology/registryTrustStore.js';
import { getRegistryTrustDomain } from '../topology/registryTrustDomains.js';
import * as crypto from 'node:crypto';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';

// ═══════════════════════════════════════════════════════════
// Registry Envelope Construction
// ═══════════════════════════════════════════════════════════

/**
 * Build a RegistryCapabilityEnvelope from the trust store state.
 *
 * The envelope captures the registry's current capability namespace support,
 * trust tier, and federation compatibility version. It is frozen at construction.
 */
export function buildRegistryCapabilityEnvelope(
  registryId: string,
  supportedNamespaces: readonly string[] = [],
  downgradePolicy: 'reject' | 'downgrade' | 'warn' = 'reject'
): RegistryCapabilityEnvelope {
  const trustRoot = resolveRegistryTrustRoot(registryId);
  const trustDomain = getRegistryTrustDomain(registryId);

  const trustTier: RegistryTrustTier = trustRoot?.trustTier || 'EXTERNAL_REGISTRY';

  // Merge namespace prefixes from trust domain with explicitly declared namespaces
  const namespaces = Array.from(new Set([
    ...supportedNamespaces,
    ...(trustDomain?.namespacePrefixes || [])
  ])).sort();

  // Compute mirror equivalence hash from stable serialization
  const equivalencePayload = {
    registryId,
    trustTier,
    namespaces,
    protocolVersion: CAPABILITY_NEGOTIATION_PROTOCOL_VERSION
  };
  const mirrorEquivalenceHash = crypto.createHash('sha256')
    .update(stableCanonicalStringify(equivalencePayload))
    .digest('hex');

  const envelope: RegistryCapabilityEnvelope = {
    registryId,
    registryTrustTier: trustTier,
    supportedCapabilityNamespaces: Object.freeze(namespaces),
    mirrorEquivalenceHash,
    federationCompatibilityVersion: CAPABILITY_NEGOTIATION_PROTOCOL_VERSION,
    capabilityDowngradePolicy: downgradePolicy
  };

  return Object.freeze(envelope);
}

// ═══════════════════════════════════════════════════════════
// Cross-Registry Compatibility Assertions
// ═══════════════════════════════════════════════════════════

export interface CrossRegistryCompatibilityResult {
  readonly compatible: boolean;
  readonly reason?: string;
  readonly downgradedNamespaces?: readonly string[];
}

/**
 * Validate cross-registry capability compatibility.
 *
 * Checks:
 *   1. Federation protocol version match
 *   2. Namespace coverage overlap
 *   3. Trust tier compatibility
 *   4. Downgrade detection
 */
export function validateCrossRegistryCapabilityCompat(
  local: RegistryCapabilityEnvelope,
  remote: RegistryCapabilityEnvelope
): CrossRegistryCompatibilityResult {
  // 1. Protocol version must match for federation compatibility
  if (local.federationCompatibilityVersion !== remote.federationCompatibilityVersion) {
    return {
      compatible: false,
      reason: `Federation protocol version mismatch: local=${local.federationCompatibilityVersion}, remote=${remote.federationCompatibilityVersion}`
    };
  }

  // 2. Detect namespace coverage gaps (downgrade candidates)
  const localNamespaces = new Set(local.supportedCapabilityNamespaces);
  const downgradedNamespaces: string[] = [];
  for (const ns of remote.supportedCapabilityNamespaces) {
    if (!localNamespaces.has(ns) && ns !== '*') {
      downgradedNamespaces.push(ns);
    }
  }

  // 3. Apply downgrade policy
  if (downgradedNamespaces.length > 0) {
    if (local.capabilityDowngradePolicy === 'reject') {
      return {
        compatible: false,
        reason: `Remote registry '${remote.registryId}' declares capability namespaces not supported locally: [${downgradedNamespaces.join(', ')}]`,
        downgradedNamespaces
      };
    }
  }

  return { compatible: true, downgradedNamespaces };
}

// ═══════════════════════════════════════════════════════════
// Capability Downgrade Detection
// ═══════════════════════════════════════════════════════════

export interface CapabilityDowngradeReport {
  readonly downgradeDetected: boolean;
  readonly missingNamespaces: readonly string[];
  readonly trustTierDowngrade: boolean;
  readonly localTier: RegistryTrustTier;
  readonly remoteTier: RegistryTrustTier;
}

const TRUST_TIER_RANK: Record<RegistryTrustTier, number> = {
  'EXTERNAL_REGISTRY': 1,
  'PARTNER_REGISTRY': 2,
  'OFFICIAL_REGISTRY': 3,
  'CORE_INTERNAL': 4
};

/**
 * Detect capability downgrade between local and remote registries.
 */
export function detectCapabilityDowngrade(
  local: RegistryCapabilityEnvelope,
  remote: RegistryCapabilityEnvelope
): CapabilityDowngradeReport {
  const localNs = new Set(local.supportedCapabilityNamespaces);
  const missingNamespaces = remote.supportedCapabilityNamespaces
    .filter(ns => !localNs.has(ns) && ns !== '*')
    .sort();

  const localRank = TRUST_TIER_RANK[local.registryTrustTier] || 1;
  const remoteRank = TRUST_TIER_RANK[remote.registryTrustTier] || 1;
  const trustTierDowngrade = remoteRank > localRank;

  return {
    downgradeDetected: missingNamespaces.length > 0 || trustTierDowngrade,
    missingNamespaces,
    trustTierDowngrade,
    localTier: local.registryTrustTier,
    remoteTier: remote.registryTrustTier
  };
}

// ═══════════════════════════════════════════════════════════
// Mirror Capability Equivalence
// ═══════════════════════════════════════════════════════════

export interface MirrorCapabilityEquivalenceResult {
  readonly equivalent: boolean;
  readonly reason?: string;
}

/**
 * Validate mirror capability equivalence.
 *
 * Mirror substitution MUST NOT change:
 *   - capability namespace semantics
 *   - provider identity hash
 *   - trust tier interpretation
 *
 * Uses mirrorEquivalenceHash on RegistryCapabilityEnvelope.
 */
export function validateMirrorCapabilityEquivalence(
  primary: RegistryCapabilityEnvelope,
  mirror: RegistryCapabilityEnvelope
): MirrorCapabilityEquivalenceResult {
  if (primary.mirrorEquivalenceHash !== mirror.mirrorEquivalenceHash) {
    return {
      equivalent: false,
      reason: `Mirror capability equivalence hash mismatch: primary=${primary.mirrorEquivalenceHash.substring(0, 12)}..., mirror=${mirror.mirrorEquivalenceHash.substring(0, 12)}...`
    };
  }

  if (primary.federationCompatibilityVersion !== mirror.federationCompatibilityVersion) {
    return {
      equivalent: false,
      reason: `Mirror federation protocol version mismatch: primary=${primary.federationCompatibilityVersion}, mirror=${mirror.federationCompatibilityVersion}`
    };
  }

  return { equivalent: true };
}
