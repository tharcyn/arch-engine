import { OverlayAuthorityTier } from './seamContracts.js';

export type RegistryAuthorityTierMap = Record<string, OverlayAuthorityTier>;

const AUTHORITY_LADDER_CEILINGS: RegistryAuthorityTierMap = {
  'core': OverlayAuthorityTier.CORE_INTERNAL,
  'official': OverlayAuthorityTier.TRUSTED_POLICY_PACK,
  'partner': OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
  'external': OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
};

export interface AuthorityLadderDecision {
  readonly effectiveTier: OverlayAuthorityTier;
  readonly ceilingApplied: boolean;
  readonly reason?: string;
}

export function enforceRegistryAuthorityLadder(
  declaredTier: OverlayAuthorityTier,
  originRegistryId: string,
  seamGrantCeiling?: OverlayAuthorityTier
): AuthorityLadderDecision {
  const registryCeiling = AUTHORITY_LADDER_CEILINGS[originRegistryId] ?? OverlayAuthorityTier.SIGNED_EXTERNAL_PACK;
  
  let effectiveTier = declaredTier;
  let ceilingApplied = false;
  let ceilingSource = '';
  
  if (effectiveTier > registryCeiling) {
    effectiveTier = registryCeiling;
    ceilingApplied = true;
    ceilingSource = 'registry category ceiling';
  }
  
  if (seamGrantCeiling !== undefined && effectiveTier > seamGrantCeiling) {
    effectiveTier = seamGrantCeiling;
    ceilingApplied = true;
    ceilingSource = 'seam grant ceiling';
  }
  
  return {
    effectiveTier,
    ceilingApplied,
    reason: ceilingApplied 
      ? `Authority capped at tier ${effectiveTier} by ${ceilingSource} (declared tier was ${declaredTier})`
      : undefined
  };
}
