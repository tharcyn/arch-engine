import { OverlayActivationContext, OverlayAuthorityResolutionResult, OverlayAuthorityTier, SeamMergeMode, OverlaySeamAuthorityGrant } from './seamContracts.js';
import { verifyOverlaySignature, OverlaySignatureVerificationResult } from './overlaySignatureVerifier.js';
import { isTrustTierSufficient, RegistryTrustTier } from './registryTrustStore.js';
import { isOverlayRevoked } from './overlayRevocationList.js';
import { validateRegistryAdmission } from './registryAdmissionPolicy.js';
import { resolveActiveTrustRoot } from './registryTrustLifecycle.js';
import { validateNamespaceOwnership } from './overlayNamespaceOwnership.js';
import { enforceRegistryAuthorityLadder } from './registryAuthorityLadder.js';

/**
 * Optional per-handler identity override for federation-grade binding.
 * When provided, handler identity takes precedence over activation-context identity.
 */
export interface HandlerIdentityOverride {
  readonly overlaySourceId: string;
  readonly overlayVersion: string;
  readonly overlaySignature?: string;
  readonly overlayRegistrySource?: string;
  readonly overlayOriginRegistry?: string;
  readonly overlayNamespace?: string;
}

/**
 * F-2: Seam grant resolution result metadata.
 * Returned alongside the main resolution result for telemetry enrichment.
 */
export interface SeamGrantResolutionMeta {
  readonly seamGrantPresent: boolean;
  readonly seamGrantMaxTier?: OverlayAuthorityTier;
  readonly seamGrantAllowsMergeMode?: boolean;
}

/**
 * F-3: Signature verification result metadata.
 * Returned alongside the main resolution result for telemetry enrichment.
 */
export interface SignatureVerificationMeta {
  readonly signaturePresent: boolean;
  readonly signatureValid: boolean;
  readonly signatureVerificationMode: 'missing' | 'bypass' | 'verified' | 'invalid' | 'untrusted-root' | 'unknown-algorithm';
  // F-6: Extended signature telemetry
  readonly signatureKeyId?: string;
  readonly signatureAlgorithm?: string;
  readonly signatureTrustRoot?: string;
  readonly signatureEnvelopeValid?: boolean;
  readonly signedPayloadDigest?: string;
}

export function resolveOverlayAuthority(
  overlayActivationContext: OverlayActivationContext | undefined,
  seamId: string,
  mergeMode: SeamMergeMode,
  handlerIdentity?: HandlerIdentityOverride
): OverlayAuthorityResolutionResult & { seamGrantMeta?: SeamGrantResolutionMeta; signatureVerificationMeta?: SignatureVerificationMeta } {
  // Missing metadata defaults to UNTRUSTED_EXTERNAL when an activation context exists.
  // We do not silently escalate to CORE_INTERNAL unless explicitly defined for a trusted caller context.
  let authorityTier = OverlayAuthorityTier.UNTRUSTED_EXTERNAL;
  
  if (overlayActivationContext && overlayActivationContext.overlayTrustTier !== undefined) {
    authorityTier = overlayActivationContext.overlayTrustTier;
  }

  // P-1: Authority tier numeric ceiling clamp.
  if (authorityTier > OverlayAuthorityTier.CORE_INTERNAL) {
    authorityTier = OverlayAuthorityTier.UNTRUSTED_EXTERNAL;
  }

  // F-1: Per-handler identity binding.
  const resolvedSourceId = handlerIdentity?.overlaySourceId
    || overlayActivationContext?.overlaySourceId
    || 'anonymous-overlay';
  const resolvedVersion = handlerIdentity?.overlayVersion
    || overlayActivationContext?.overlayVersion
    || '0.0.0-unspecified';
  const resolvedSignature = handlerIdentity
    ? handlerIdentity.overlaySignature
    : overlayActivationContext?.overlaySignature;
  const resolvedRegistrySource = handlerIdentity?.overlayRegistrySource 
    || overlayActivationContext?.overlayRegistrySource 
    || 'external';
  const resolvedOriginRegistry = handlerIdentity?.overlayOriginRegistry 
    || overlayActivationContext?.overlayOriginRegistry 
    || resolvedRegistrySource;
  const resolvedNamespace = handlerIdentity?.overlayNamespace 
    || overlayActivationContext?.overlayNamespace 
    || resolvedSourceId;

  // ─── 1. OVERLAY REVOCATION CHECK ─────────────────────────────────────
  // Evaluate revocation before admission or signatures.
  const revocationResult = isOverlayRevoked(resolvedSourceId, resolvedVersion, undefined, undefined);
  if (revocationResult.revoked) {
    return {
      overlaySourceId: resolvedSourceId,
      overlayVersion: resolvedVersion,
      authorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
      trustAccepted: false,
      overridePermissions: [],
      compatibilityAccepted: true,
      rejectionReason: `Overlay explicitly revoked: scope [${revocationResult.scope}], reason: ${revocationResult.reason || 'unspecified'}`
    };
  }

  // ─── 2. NAMESPACE OWNERSHIP & MIRROR VALIDATION ──────────────────────
  const namespaceResult = validateNamespaceOwnership(resolvedNamespace, resolvedOriginRegistry, resolvedRegistrySource);
  if (!namespaceResult.valid) {
    return {
      overlaySourceId: resolvedSourceId,
      overlayVersion: resolvedVersion,
      authorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
      trustAccepted: false,
      overridePermissions: [],
      compatibilityAccepted: true,
      rejectionReason: `Namespace ownership validation failed: [${namespaceResult.reason}] ${namespaceResult.details || ''}`
    };
  }

  // ─── 3. REGISTRY AUTHORITY LADDER CEILING ────────────────────────────
  // Ensure that no registry can magically grant high authority just because the payload asks for it.
  const declaredAuthorityTier = authorityTier;
  const ladderDecision = enforceRegistryAuthorityLadder(authorityTier, resolvedOriginRegistry, undefined);
  authorityTier = ladderDecision.effectiveTier;

  // ─── 4. REGISTRY ADMISSION POLICY CHECK ──────────────────────────────
  // Enforce additional F-8 admission rules if any.
  const admissionResult = validateRegistryAdmission(resolvedRegistrySource, declaredAuthorityTier, !!resolvedSignature);
  if (!admissionResult.allowed) {
    return {
      overlaySourceId: resolvedSourceId,
      overlayVersion: resolvedVersion,
      authorityTier,
      trustAccepted: false,
      overridePermissions: [],
      compatibilityAccepted: true,
      rejectionReason: admissionResult.rejectionReason || 'Registry admission policy rejected authority'
    };
  }
  if (admissionResult.cappedTier !== undefined && admissionResult.cappedTier < authorityTier) {
     authorityTier = admissionResult.cappedTier;
  }

  // ─── 3 & 4. TRUST-ROOT RESOLUTION & SIGNATURE VALIDATION ────────────
  let signatureVerificationMeta: SignatureVerificationMeta | undefined;

  if (authorityTier >= OverlayAuthorityTier.SIGNED_EXTERNAL_PACK) {
    const rawSigResult = verifyOverlaySignature({
      overlaySourceId: resolvedSourceId,
      overlayVersion: resolvedVersion,
      overlaySignature: resolvedSignature,
      overlayRegistrySource: resolvedRegistrySource
    });

    // Check again for signature revocation (since now we parsed it and might have a digest)
    if (rawSigResult.signedPayloadDigest) {
       const sigRevokedCheck = isOverlayRevoked(resolvedSourceId, resolvedVersion, rawSigResult.signedPayloadDigest, undefined);
       if (sigRevokedCheck.revoked) {
         return {
            overlaySourceId: resolvedSourceId,
            overlayVersion: resolvedVersion,
            authorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
            trustAccepted: false,
            overridePermissions: [],
            compatibilityAccepted: true,
            rejectionReason: `Overlay signature explicitly revoked: ${sigRevokedCheck.reason || 'unspecified'}`
         };
       }
    }

    signatureVerificationMeta = {
      signaturePresent: rawSigResult.signaturePresent,
      signatureValid: rawSigResult.signatureValid,
      signatureVerificationMode: rawSigResult.verificationMode,
      signatureKeyId: rawSigResult.signatureKeyId,
      signatureAlgorithm: rawSigResult.signatureAlgorithm,
      signatureTrustRoot: rawSigResult.signatureTrustRoot,
      signatureEnvelopeValid: rawSigResult.signatureEnvelopeValid,
      signedPayloadDigest: rawSigResult.signedPayloadDigest
    };

    if (!rawSigResult.signatureValid) {
      return {
        overlaySourceId: resolvedSourceId,
        overlayVersion: resolvedVersion,
        authorityTier,
        trustAccepted: false,
        overridePermissions: [],
        compatibilityAccepted: true,
        rejectionReason: rawSigResult.signaturePresent
          ? `Signature invalid for signed-tier claim on ${resolvedSourceId}@${resolvedVersion}: ${rawSigResult.rejectionReason || 'unknown'}`
          : `Signature missing for signed-tier claim on ${resolvedSourceId}@${resolvedVersion}`,
        signatureVerificationMeta
      };
    }

    // F-6: Trust root authorization hierarchy enforcement.
    const rootTierRaw = rawSigResult.signatureTrustRoot || 'external';
    let rootTier: RegistryTrustTier = 'EXTERNAL_REGISTRY';
    if (rootTierRaw === 'core') rootTier = 'CORE_INTERNAL';
    else if (rootTierRaw === 'official') rootTier = 'OFFICIAL_REGISTRY';
    else if (rootTierRaw === 'partner') rootTier = 'PARTNER_REGISTRY';
    
    if (rawSigResult.signatureKeyId === 'legacy') {
        rootTier = 'CORE_INTERNAL';
    }

    if (authorityTier === OverlayAuthorityTier.CORE_INTERNAL) {
      if (!isTrustTierSufficient(rootTier, 'CORE_INTERNAL')) {
          return { overlaySourceId: resolvedSourceId, overlayVersion: resolvedVersion, authorityTier, trustAccepted: false, overridePermissions: [], compatibilityAccepted: true, rejectionReason: `Trust root escalation blocked: ${rootTier} cannot claim CORE_INTERNAL authority`, signatureVerificationMeta };
      }
    } else if (authorityTier === OverlayAuthorityTier.TRUSTED_POLICY_PACK) {
      if (!isTrustTierSufficient(rootTier, 'PARTNER_REGISTRY')) {
          return { overlaySourceId: resolvedSourceId, overlayVersion: resolvedVersion, authorityTier, trustAccepted: false, overridePermissions: [], compatibilityAccepted: true, rejectionReason: `Trust root escalation blocked: ${rootTier} cannot claim TRUSTED_POLICY_PACK authority`, signatureVerificationMeta };
      }
    } else if (authorityTier === OverlayAuthorityTier.SIGNED_EXTERNAL_PACK) {
      if (!isTrustTierSufficient(rootTier, 'EXTERNAL_REGISTRY')) {
          return { overlaySourceId: resolvedSourceId, overlayVersion: resolvedVersion, authorityTier, trustAccepted: false, overridePermissions: [], compatibilityAccepted: true, rejectionReason: `Trust root escalation blocked: ${rootTier} cannot claim SIGNED_EXTERNAL_PACK authority`, signatureVerificationMeta };
      }
    }
  }

  // ─── 5. PER-SEAM AUTHORITY GRANT ENFORCEMENT ───────────────────────
  // Evaluated AFTER trust-root resolution and signature validation are sound and verified.
  let seamGrantMeta: SeamGrantResolutionMeta | undefined;

  if (overlayActivationContext?.authorityGrants !== undefined) {
    const grant = overlayActivationContext.authorityGrants[seamId];

    if (!grant) {
      seamGrantMeta = { seamGrantPresent: false };
      return { overlaySourceId: resolvedSourceId, overlayVersion: resolvedVersion, authorityTier, trustAccepted: false, overridePermissions: [], compatibilityAccepted: true, rejectionReason: `Seam ${seamId} not present in authorityGrants — seam not granted`, seamGrantMeta, signatureVerificationMeta };
    }

    const cappedTier = Math.min(authorityTier, grant.maxTier) as OverlayAuthorityTier;
    authorityTier = cappedTier;

    const mergeModeAllowed = grant.allowedMergeModes.includes(mergeMode);
    seamGrantMeta = { seamGrantPresent: true, seamGrantMaxTier: grant.maxTier, seamGrantAllowsMergeMode: mergeModeAllowed };

    if (!mergeModeAllowed) {
      return { overlaySourceId: resolvedSourceId, overlayVersion: resolvedVersion, authorityTier, trustAccepted: false, overridePermissions: [], compatibilityAccepted: true, rejectionReason: `Merge mode '${mergeMode}' not allowed for seam ${seamId} — grant allows: [${grant.allowedMergeModes.join(', ')}]`, seamGrantMeta, signatureVerificationMeta };
    }
  }

  const result: OverlayAuthorityResolutionResult & { seamGrantMeta?: SeamGrantResolutionMeta; signatureVerificationMeta?: SignatureVerificationMeta } = {
    overlaySourceId: resolvedSourceId,
    overlayVersion: resolvedVersion,
    authorityTier,
    trustAccepted: false,
    overridePermissions: [],
    compatibilityAccepted: true,
    seamGrantMeta,
    signatureVerificationMeta
  };

  if (mergeMode === 'replace-if-authorized') {
    if (authorityTier >= OverlayAuthorityTier.TRUSTED_POLICY_PACK) {
      if (overlayActivationContext?.allowPrecedenceOverrides) {
         result.trustAccepted = true;
         result.overridePermissions.push('replace');
      } else {
         result.trustAccepted = false;
         result.rejectionReason = 'replace-if-authorized requested but allowPrecedenceOverrides is false';
      }
    } else {
      result.trustAccepted = false;
      result.rejectionReason = 'Insufficient trust tier for replace-if-authorized merge mode';
    }
    return result;
  }

  if (mergeMode === 'merge-by-key') {
    if (authorityTier >= OverlayAuthorityTier.SIGNED_EXTERNAL_PACK) {
      result.trustAccepted = true;
      result.overridePermissions.push('extend_keys');
    } else {
      result.trustAccepted = false;
      result.rejectionReason = 'Insufficient trust tier for merge-by-key merge mode';
    }
    return result;
  }

  if (mergeMode === 'append') {
    if (authorityTier >= OverlayAuthorityTier.UNTRUSTED_EXTERNAL) {
      result.trustAccepted = true;
      result.overridePermissions.push('append_array');
    } else {
      result.trustAccepted = false;
      result.rejectionReason = 'Insufficient trust tier for append merge mode';
    }
    return result;
  }

  result.trustAccepted = false;
  result.rejectionReason = 'Unrecognized or unauthorized merge mode requested';
  return result;
}
