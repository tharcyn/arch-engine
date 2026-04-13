import { OverlayAuthorityTier } from './seamContracts.js';

export interface OverlayCompatibilityRecord {
  overlaySourceId: string;
  overlayVersion: string;
  compatibleWithCoreVersions?: string[];
  compatibleWithPolicySchemaVersions?: string[];
  requiresCapabilities?: string[];
  incompatibleWith?: string[];
  minimumTrustTier?: OverlayAuthorityTier;
}

export interface CompatibilityDecision {
  valid: boolean;
  reason?: string;
  incompatibleItems?: string[];
}

/**
 * Validates overlay compatibility against core schema and required capabilities.
 * Must occur during admission, NOT during execution.
 * 
 * Compatibility diagnostics MUST expose categorical outcomes only.
 * Diagnostics MUST NOT expose:
 * - numeric minimum trust tier values
 * - numeric effective authority tier values
 * - trust comparison arithmetic
 */
export function validateOverlayCompatibility(
  record: OverlayCompatibilityRecord,
  runningCoreVersion: string,
  runningPolicySchemaVersion: string,
  availableCapabilities: string[],
  activeOverlays: string[],
  effectiveAuthorityTier?: OverlayAuthorityTier
): CompatibilityDecision {
  const incompatibleItems: string[] = [];

  if (record.minimumTrustTier !== undefined && effectiveAuthorityTier !== undefined) {
    if (effectiveAuthorityTier < record.minimumTrustTier) {
      incompatibleItems.push('Overlay minimum trust tier requirement not met by effective authority tier.');
    }
  }

  if (record.compatibleWithCoreVersions && !record.compatibleWithCoreVersions.includes(runningCoreVersion)) {
    incompatibleItems.push(`Core version ${runningCoreVersion} not explicitly supported.`);
  }

  if (record.compatibleWithPolicySchemaVersions && !record.compatibleWithPolicySchemaVersions.includes(runningPolicySchemaVersion)) {
    incompatibleItems.push(`Schema version ${runningPolicySchemaVersion} not supported.`);
  }

  if (record.requiresCapabilities) {
    for (const cap of record.requiresCapabilities) {
      if (!availableCapabilities.includes(cap)) {
        incompatibleItems.push(`Required capability missing: ${cap}`);
      }
    }
  }

  if (record.incompatibleWith) {
    for (const inc of record.incompatibleWith) {
      if (activeOverlays.includes(inc)) {
        incompatibleItems.push(`Explicit incompatibility with active overlay: ${inc}`);
      }
    }
  }

  if (incompatibleItems.length > 0) {
    return { valid: false, reason: 'Compatibility negotiation failed', incompatibleItems };
  }

  return { valid: true };
}
