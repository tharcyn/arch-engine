import { RegistryTrustTier, isTrustTierSufficient } from './registryTrustStore.js';
import { OverlayAuthorityTier } from './seamContracts.js';

export interface RegistryAdmissionPolicy {
  registryId: string;
  allowedTrustTiers: readonly OverlayAuthorityTier[];
  allowUnsignedOverlays: boolean;
}

const admissionPolicies = new Map<string, RegistryAdmissionPolicy>();

/**
 * Register an admission policy for a registry. Local configuration for F-8.
 */
export function registerAdmissionPolicy(policy: RegistryAdmissionPolicy): void {
  admissionPolicies.set(policy.registryId, Object.freeze({
      ...policy,
      allowedTrustTiers: Object.freeze([...policy.allowedTrustTiers])
  }));
}

/**
 * Validates a requested authority tier against the registry's admission ceiling.
 * Rule: Registry admission policy MUST NOT upgrade authority. It can only ceiling, reject, or downgrade.
 */
export function validateRegistryAdmission(
  registryId: string,
  requestedTier: OverlayAuthorityTier,
  hasSignature: boolean
): { allowed: boolean; cappedTier?: OverlayAuthorityTier; rejectionReason?: string } {

  const policy = admissionPolicies.get(registryId);
  if (!policy) {
    // If no explicit policy exists, fallback to default safe ceilings matching F-6 trust tiers
    return validateDefaultAdmission(registryId, requestedTier, hasSignature);
  }

  if (!hasSignature && !policy.allowUnsignedOverlays && requestedTier > OverlayAuthorityTier.UNTRUSTED_EXTERNAL) {
    return { allowed: false, rejectionReason: `Registry ${registryId} policy rejects unsigned overlays for trusted tiers` };
  }

  // Ensure requested tier is within allowed bounds. We ceiling it down to the highest allowed tier
  // that is <= requestedTier. We never elevate.
  let highestAllowed = OverlayAuthorityTier.UNTRUSTED_EXTERNAL;
  for (const allowed of policy.allowedTrustTiers) {
    if (allowed <= requestedTier && allowed > highestAllowed) {
      highestAllowed = allowed;
    }
  }

  // The resulting tier can NEVER be higher than the requested tier.
  if (highestAllowed > requestedTier) {
     // Failsafe, this should be impossible mathematically based on the above loop
     highestAllowed = requestedTier;
  }

  return { allowed: true, cappedTier: highestAllowed };
}

function validateDefaultAdmission(
    registryId: string, 
    requestedTier: OverlayAuthorityTier,
    hasSignature: boolean
): { allowed: boolean; cappedTier?: OverlayAuthorityTier; rejectionReason?: string } {
    let maxAllowed = OverlayAuthorityTier.UNTRUSTED_EXTERNAL;
    
    // Default F-6 aligned ceilings
    switch (registryId) {
        case 'core': 
            maxAllowed = OverlayAuthorityTier.CORE_INTERNAL; break;
        case 'official': 
            maxAllowed = OverlayAuthorityTier.TRUSTED_POLICY_PACK; break;
        case 'partner': 
            maxAllowed = OverlayAuthorityTier.SIGNED_EXTERNAL_PACK; break;
        case 'external': 
        default:
            maxAllowed = OverlayAuthorityTier.UNTRUSTED_EXTERNAL; break;
    }

    if (maxAllowed < requestedTier) {
        return { allowed: false, rejectionReason: `Registry admission policy violation: ${registryId} cannot elevate payload to requested tier ${requestedTier} (ceiling: ${maxAllowed})` };
    }

    // Default enforces signature for external packs, but this is handled by verify signature phase anyway.
    return { allowed: true, cappedTier: requestedTier };
}
