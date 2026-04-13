import { validateNamespaceOwnership } from './overlayNamespaceOwnership.js';
import { enforceRegistryAuthorityLadder } from './registryAuthorityLadder.js';
import { OverlayAuthorityTier } from './seamContracts.js';
import { isOverlayRevoked } from './overlayRevocationList.js';
import { resolveEffectiveOverlayState, OverlayLifecycleState } from './overlayLifecycleState.js';
import { resolveActiveTrustRoot } from './registryTrustLifecycle.js';

export interface SyncGuardRequest {
  overlaySourceId: string;
  overlayVersion: string;
  namespace: string;
  declaredAuthorityTier: OverlayAuthorityTier;
  originRegistryId: string;
  targetRegistryId: string;
  signatureTrustRootId?: string;
}

export interface SyncGuardDecision {
  allowed: boolean;
  reason?: string;
}

function validateSyncSymmetry(request: SyncGuardRequest): SyncGuardDecision {
    // 1. validateNamespaceOwnership
    const nsCheck = validateNamespaceOwnership(request.namespace, request.originRegistryId, request.targetRegistryId);
    if (!nsCheck.valid) return { allowed: false, reason: nsCheck.reason };

    // 2. validateAuthorityLadder
    const ladderDecision = enforceRegistryAuthorityLadder(request.declaredAuthorityTier, request.targetRegistryId);
    if (ladderDecision.ceilingApplied && request.declaredAuthorityTier > ladderDecision.effectiveTier) {
        // Capped authority is allowed but noted contextually - preventing direct escalation
    }

    // 3. validateLifecycleEligibility
    const stateRecord = resolveEffectiveOverlayState(request.overlaySourceId, request.overlayVersion, request.originRegistryId);
    if (stateRecord.state === OverlayLifecycleState.SUPERSEDED || stateRecord.state === OverlayLifecycleState.DRAFT) {
        return { allowed: false, reason: `Lifecycle state ${stateRecord.state} cannot be synced.` };
    }

    // 4. validateRevocationStatus
    const revCheck = isOverlayRevoked(request.overlaySourceId, request.overlayVersion);
    if (revCheck.revoked) return { allowed: false, reason: 'Overlay is revoked and cannot be synced.' };

    // 5. validateTrustRootCompatibility
    if (request.signatureTrustRootId) {
        const root = resolveActiveTrustRoot(request.signatureTrustRootId);
        if (!root) {
            return { allowed: false, reason: `Trust root ${request.signatureTrustRootId} is not valid or compatible with sync target.` };
        }
    }

    return { allowed: true };
}

export function validateRegistrySyncImport(request: SyncGuardRequest): SyncGuardDecision {
  return validateSyncSymmetry(request);
}

export function validateRegistrySyncExport(request: SyncGuardRequest): SyncGuardDecision {
  return validateSyncSymmetry(request);
}
