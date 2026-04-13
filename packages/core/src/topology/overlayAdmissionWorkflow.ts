import { validateNamespaceOwnership } from './overlayNamespaceOwnership.js';
import { enforceRegistryAuthorityLadder } from './registryAuthorityLadder.js';
import { isOverlayRevoked } from './overlayRevocationList.js';
import { OverlayAuthorityTier } from './seamContracts.js';
import { resolveActiveTrustRoot } from './registryTrustLifecycle.js';
import { OverlayCompatibilityRecord, validateOverlayCompatibility } from './overlayCompatibilityMatrix.js';
import { OverlayLifecycleState, setOverlayLifecycleState, resolveEffectiveOverlayState } from './overlayLifecycleState.js';

export interface OverlayAdmissionRequest {
  overlaySourceId: string;
  overlayVersion: string;
  declaredAuthorityTier: OverlayAuthorityTier;
  registryId: string;
  originRegistryId: string;
  namespace: string;
  signatureDigest?: string;
  signatureTrustRootId?: string;
  compatibilityRecord?: OverlayCompatibilityRecord;
}

export interface AdmissionValidationResult {
  admitted: boolean;
  reason?: string;
  effectiveAuthorityTier?: OverlayAuthorityTier;
}

export function submitOverlayForAdmission(request: OverlayAdmissionRequest): void {
  setOverlayLifecycleState({
    overlaySourceId: request.overlaySourceId,
    overlayVersion: request.overlayVersion,
    registryId: request.registryId,
    lifecycleState: OverlayLifecycleState.SUBMITTED
  });
}

/**
 * Overlay lifecycle admission decisions MUST complete before
 * loaderPipeline.ts closure identity assembly begins.
 * 
 * Lifecycle governance affects execution eligibility only,
 * never closure identity construction.
 */
export function validateOverlayAdmission(
  request: OverlayAdmissionRequest,
  runningCoreVersion: string,
  runningPolicySchemaVersion: string,
  availableCapabilities: string[],
  activeOverlays: string[]
): AdmissionValidationResult {
  
  // 1. Revocation Check
  const revocationCheck = isOverlayRevoked(request.overlaySourceId, request.overlayVersion, request.signatureDigest);
  if (revocationCheck.revoked) {
    return { admitted: false, reason: `Overlay revoked: ${revocationCheck.reason || 'unspecified'}` };
  }

  // 2. Lifecycle state eligibility
  const lifecycleEligibility = resolveEffectiveOverlayState(request.overlaySourceId, request.overlayVersion, request.registryId);
  if (lifecycleEligibility.state === OverlayLifecycleState.REVOKED) {
      return { admitted: false, reason: 'Lifecycle explicitly prevents execution: REVOKED' };
  }

  // 3. Namespace Ownership
  const namespaceCheck = validateNamespaceOwnership(request.namespace, request.originRegistryId, request.registryId);
  if (!namespaceCheck.valid) {
    return { admitted: false, reason: `Namespace violation: ${namespaceCheck.reason}` };
  }

  // 4. Registry Authority Ladder mapping
  const ladderResult = enforceRegistryAuthorityLadder(request.declaredAuthorityTier, request.originRegistryId);
  const effectiveAuthorityTier = ladderResult.effectiveTier;

  // 5. Compatibility validation
  if (request.compatibilityRecord) {
    const compatResult = validateOverlayCompatibility(
      request.compatibilityRecord, 
      runningCoreVersion, 
      runningPolicySchemaVersion, 
      availableCapabilities, 
      activeOverlays,
      effectiveAuthorityTier
    );
    if (!compatResult.valid) {
      return { admitted: false, reason: `Compatibility failure: ${compatResult.reason}` };
    }
  }

  // 6. Supersession exclusion
  if (lifecycleEligibility.state === OverlayLifecycleState.SUPERSEDED && !lifecycleEligibility.allowed) {
      return { admitted: false, reason: `Supersession exclusion: overlay is superseded` };
  }

  // 7. Trust-Root validity
  if (request.signatureTrustRootId) {
    const root = resolveActiveTrustRoot(request.signatureTrustRootId);
    if (!root) {
      return { admitted: false, reason: `Invalid or missing active trust root: ${request.signatureTrustRootId}` };
    }
  } else if (effectiveAuthorityTier >= OverlayAuthorityTier.SIGNED_EXTERNAL_PACK) {
    return { admitted: false, reason: 'Signature trust root missing for expected signed tier.' };
  }

  // 8. Signature Envelope Verification
  if (effectiveAuthorityTier >= OverlayAuthorityTier.SIGNED_EXTERNAL_PACK && !request.signatureDigest) {
       return { admitted: false, reason: 'Signature digest is explicitly missing for signed tier.' };
  }

  return { admitted: true, effectiveAuthorityTier };
}

/**
 * Resolution strategy selects candidate overlays only.
 * Resolution strategy MUST NOT influence:
 * - snapshotClosureGraphHash
 * - fingerprint identity arrays
 * - closureProvenance construction
 * - signature validation logic
 * - merge-mode evaluation
 * Closure identity derives exclusively from the final overlay stack after precedence algebra execution.
 */
export function approveOverlayAdmission(request: OverlayAdmissionRequest): void {
  setOverlayLifecycleState({
    overlaySourceId: request.overlaySourceId,
    overlayVersion: request.overlayVersion,
    registryId: request.registryId,
    lifecycleState: OverlayLifecycleState.ADMITTED // Transition to ADMITTED
  });
}

export function rejectOverlayAdmission(request: OverlayAdmissionRequest, reason: string): void {
  setOverlayLifecycleState({
    overlaySourceId: request.overlaySourceId,
    overlayVersion: request.overlayVersion,
    registryId: request.registryId,
    lifecycleState: OverlayLifecycleState.REVOKED // Or another terminal reject state
  });
}

import { 
  resolveOverlaySelection, 
  OverlayResolutionContext, 
  ResolutionStrategy,
  OverlayCandidate
} from './overlayResolutionPolicy.js';

export function processOverlayEligibilityAndResolution(
  seamId: string,
  candidates: OverlayAdmissionRequest[],
  runningCoreVersion: string,
  runningPolicySchemaVersion: string,
  availableCapabilities: string[],
  activeOverlays: string[],
  strategy: ResolutionStrategy = ResolutionStrategy.AUTHORITY_FIRST,
  resolutionContextOverrides?: Partial<OverlayResolutionContext>
): OverlayCandidate[] {
  
  const admittedCandidates: OverlayCandidate[] = [];

  for (const candidate of candidates) {
    const admission = validateOverlayAdmission(
      candidate,
      runningCoreVersion,
      runningPolicySchemaVersion,
      availableCapabilities,
      activeOverlays
    );

    if (admission.admitted) {
      admittedCandidates.push({
        overlaySourceId: candidate.overlaySourceId,
        overlayVersion: candidate.overlayVersion,
        registryId: candidate.registryId,
        authorityTier: admission.effectiveAuthorityTier || candidate.declaredAuthorityTier,
        registryTrustDomain: 1 // Naive lookup for F-11 default
      });
    }
  }

  const resolutionContext: OverlayResolutionContext = {
    seamId,
    candidateOverlays: admittedCandidates,
    ...resolutionContextOverrides
  };

  // Resolution strictly after admission validation and before stacking
  return resolveOverlaySelection(resolutionContext, strategy);
}
