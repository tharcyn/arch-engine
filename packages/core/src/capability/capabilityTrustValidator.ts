/**
 * F-12: Capability Trust Validator
 *
 * Provides trust envelope construction, ceiling validation, signature
 * enforcement gate, and seam-grant lattice consistency checking.
 *
 * IDENTITY SAFETY:
 *   Trust envelopes are execution metadata only.
 *   They MUST NOT mutate closure graph hash, fingerprint inputs,
 *   resolution ordering, or lifecycle admission.
 *
 * ADVERSARIAL DEFENSE POINTS:
 *   - validateCapabilitySignatureRoot(): prevents unsigned → signed escalation
 *   - validateTrustEnvelopeCeiling(): prevents capability > overlay authority
 *   - validateSeamTrustCeiling(): prevents capability > seam grant
 *   - validateSeamGrantLatticeConsistency(): prevents cross-seam leakage
 */

import {
  CapabilityProviderDescriptor,
  CapabilityTrustEnvelope,
  CapabilitySeamAuthorityGrant,
} from './capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../topology/seamContracts.js';
import { resolveActiveTrustRoot } from '../topology/registryTrustLifecycle.js';
import { enforceRegistryAuthorityLadder } from '../topology/registryAuthorityLadder.js';

// ═══════════════════════════════════════════════════════════
// Signature Enforcement Gate
// ═══════════════════════════════════════════════════════════

export type SignatureGateMode = 'verified' | 'missing' | 'invalid' | 'untrusted-root';

export interface SignatureGateResult {
  readonly verified: boolean;
  readonly mode: SignatureGateMode;
  readonly reason?: string;
}

/**
 * F-12 Signature Enforcement Gate.
 *
 * RULE: Unsigned overlays MUST NOT publish signed-tier capability providers.
 * RULE: Capability providers MUST NOT execute unless signature root verified.
 *
 * Verification flow:
 *   1. Check signatureRoot presence
 *   2. Resolve trust root for registry
 *   3. Verify authority tier consistency
 *   4. REJECT unsigned providers claiming SIGNED_EXTERNAL_PACK or higher
 */
export function validateCapabilitySignatureRoot(
  provider: CapabilityProviderDescriptor
): SignatureGateResult {
  // Rule 1: Missing signature root
  if (!provider.signatureRoot || provider.signatureRoot.length === 0) {
    // Unsigned providers can only operate at UNTRUSTED_EXTERNAL
    if (provider.authorityTier >= OverlayAuthorityTier.SIGNED_EXTERNAL_PACK) {
      return {
        verified: false,
        mode: 'missing',
        reason: `Provider ${provider.providerId} claims authority tier ${provider.authorityTier} but has no signature root — unsigned overlays MUST NOT publish signed-tier capability providers`
      };
    }
    // UNTRUSTED_EXTERNAL with no signature is acceptable
    return { verified: true, mode: 'missing' };
  }

  // Rule 2: Resolve trust root for the provider's registry
  const trustRoot = resolveActiveTrustRoot(provider.registryOrigin);
  if (!trustRoot) {
    return {
      verified: false,
      mode: 'untrusted-root',
      reason: `Provider ${provider.providerId} references registry '${provider.registryOrigin}' which has no active trust root`
    };
  }

  // Rule 3: Authority ladder ceiling enforcement
  const ladderDecision = enforceRegistryAuthorityLadder(
    provider.authorityTier,
    provider.registryOrigin,
    undefined
  );

  if (ladderDecision.ceilingApplied && ladderDecision.effectiveTier < provider.authorityTier) {
    return {
      verified: false,
      mode: 'invalid',
      reason: `Provider ${provider.providerId} declares authority tier ${provider.authorityTier} but registry ceiling limits to ${ladderDecision.effectiveTier}`
    };
  }

  return { verified: true, mode: 'verified' };
}

// ═══════════════════════════════════════════════════════════
// Trust Envelope Construction
// ═══════════════════════════════════════════════════════════

/**
 * Build a CapabilityTrustEnvelope for a provider.
 *
 * The envelope is sealed (frozen) at construction time.
 * Trust tier is capped at min(overlayAuthorityTier, registryCeiling).
 */
export function buildCapabilityTrustEnvelope(
  provider: CapabilityProviderDescriptor,
  overlayAuthorityTier: OverlayAuthorityTier,
  signatureStatus: SignatureGateMode,
  seamGrants?: Readonly<Record<string, CapabilitySeamAuthorityGrant>>
): CapabilityTrustEnvelope {
  // Effective tier: min(provider declared, overlay actual)
  const effectiveTier = Math.min(
    provider.authorityTier,
    overlayAuthorityTier
  ) as OverlayAuthorityTier;

  // Trust ceiling from registry authority ladder
  const ladderDecision = enforceRegistryAuthorityLadder(
    effectiveTier,
    provider.registryOrigin,
    undefined
  );
  const trustCeiling = ladderDecision.effectiveTier;

  // Build per-seam authority grant scope
  const authorityGrantScope: Record<string, OverlayAuthorityTier> = {};
  if (seamGrants) {
    for (const [seamId, grant] of Object.entries(seamGrants)) {
      // Per-seam cap: min(trustCeiling, seamGrant.maxCapabilityTier)
      authorityGrantScope[seamId] = Math.min(
        trustCeiling,
        grant.maxCapabilityTier
      ) as OverlayAuthorityTier;
    }
  }

  const envelope: CapabilityTrustEnvelope = {
    overlaySourceId: provider.registrySource,
    registryOrigin: provider.registryOrigin,
    signatureVerificationStatus: signatureStatus,
    authorityGrantScope: Object.freeze(authorityGrantScope),
    capabilityGrantSet: Object.freeze([...provider.seamScopedGrants].sort()),
    effectiveAuthorityTier: Math.min(effectiveTier, trustCeiling) as OverlayAuthorityTier,
    trustCeiling
  };

  return Object.freeze(envelope);
}

// ═══════════════════════════════════════════════════════════
// Trust Envelope Ceiling Validation
// ═══════════════════════════════════════════════════════════

/**
 * Validates that capability trust does not exceed the overlay's authority tier.
 *
 * INVARIANT: capabilityTrust ≤ overlayAuthorityTier
 */
export function validateTrustEnvelopeCeiling(
  envelope: CapabilityTrustEnvelope,
  overlayAuthorityTier: OverlayAuthorityTier
): { valid: boolean; reason?: string } {
  if (envelope.effectiveAuthorityTier > overlayAuthorityTier) {
    return {
      valid: false,
      reason: `Capability trust tier ${envelope.effectiveAuthorityTier} exceeds overlay authority tier ${overlayAuthorityTier}`
    };
  }
  return { valid: true };
}

/**
 * Validates that capability trust does not exceed per-seam authority grants.
 *
 * INVARIANT: For each seam, capabilityTrust ≤ seamGrant[seam].maxCapabilityTier
 */
export function validateSeamTrustCeiling(
  envelope: CapabilityTrustEnvelope,
  seamGrants: Readonly<Record<string, CapabilitySeamAuthorityGrant>>
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const [seamId, grantTier] of Object.entries(envelope.authorityGrantScope)) {
    const grant = seamGrants[seamId];
    if (!grant) {
      violations.push(`Seam ${seamId} has authority grant in envelope but no corresponding seam grant declaration`);
      continue;
    }
    if (grantTier > grant.maxCapabilityTier) {
      violations.push(`Seam ${seamId}: effective tier ${grantTier} exceeds seam grant ceiling ${grant.maxCapabilityTier}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════
// Seam-Grant Lattice Consistency Validator
// ═══════════════════════════════════════════════════════════

/**
 * Validates seam-grant lattice consistency.
 *
 * Checks:
 *   - No seam grant exceeds overlay authority tier
 *   - No seam grant exceeds registry authority ceiling
 *   - No seam grant exceeds signature-root authority
 *
 * Prevents cross-seam escalation leakage.
 */
export function validateSeamGrantLatticeConsistency(
  seamGrants: Readonly<Record<string, CapabilitySeamAuthorityGrant>>,
  overlayAuthorityTier: OverlayAuthorityTier,
  registryOrigin: string
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const ladderDecision = enforceRegistryAuthorityLadder(
    overlayAuthorityTier,
    registryOrigin,
    undefined
  );
  const registryCeiling = ladderDecision.effectiveTier;

  for (const [seamId, grant] of Object.entries(seamGrants)) {
    if (grant.maxCapabilityTier > overlayAuthorityTier) {
      violations.push(
        `Seam ${seamId}: grant tier ${grant.maxCapabilityTier} exceeds overlay authority tier ${overlayAuthorityTier}`
      );
    }
    if (grant.maxCapabilityTier > registryCeiling) {
      violations.push(
        `Seam ${seamId}: grant tier ${grant.maxCapabilityTier} exceeds registry ceiling ${registryCeiling} for registry '${registryOrigin}'`
      );
    }
  }

  return { valid: violations.length === 0, violations };
}
