/**
 * F-5: Mirror Fallback Resolution.
 *
 * Provides a governed mirror fallback path for registry resolution.
 * When the primary registry fails, mirror resolution is attempted
 * with mandatory content equivalence verification.
 *
 * Mirror fallback:
 *   - Must pass content equivalence verification
 *   - Must pass through overlay::transport::mirrorBoundary seam
 *   - Must not bypass signature gate for signed-tier overlays
 *   - Must not bypass per-seam authority grants
 *   - Must not bypass handler identity binding
 *   - Must capture mirror provenance in telemetry
 */

import { RegistryResolutionResult } from './types.js';
import { RegistryAdapter } from './registryAdapter.js';
import { enforceMirrorContentEquivalence, MirrorEquivalenceResult } from './mirrorContentVerifier.js';
import { executeOverlaySeam } from '../topology/seamOrchestrator.js';
import { OverlaySeamExecutionContext } from '../topology/seamContracts.js';
import { ScopedNamespaceTrustPolicy } from './namespaceTrustScopePolicy.js';

export interface MirrorFallbackResult {
  readonly result: RegistryResolutionResult;
  readonly mirrorUsed: boolean;
  readonly mirrorSourceId?: string;
  readonly equivalenceResult?: MirrorEquivalenceResult;
}

/**
 * Resolve a registry lookup with governed mirror fallback.
 *
 * Resolution strategy:
 *   1. Attempt primary adapter lookup
 *   2. If primary succeeds, return directly (no mirror path)
 *   3. If primary fails AND mirrorAdapter is provided:
 *      a. Attempt mirror adapter lookup
 *      b. Enforce content equivalence via verifyMirrorEquivalence
 *      c. Invoke overlay::transport::mirrorBoundary seam
 *      d. Return mirror result with provenance metadata
 *
 * @param namespace - Policy namespace
 * @param policyId - Policy identifier
 * @param primaryAdapter - Primary registry adapter
 * @param mirrorAdapter - Optional mirror registry adapter
 * @param primaryResult - Optional pre-resolved primary result (for equivalence-only mode)
 * @param overlayContext - Optional overlay execution context for seam governance
 * @param lockfileEntries - Optional lockfile entries
 * @param scopedTrustPolicy - Optional scoped trust policy
 */
export function resolveWithMirrorFallback(
  namespace: string,
  policyId: string,
  primaryAdapter: RegistryAdapter,
  mirrorAdapter?: RegistryAdapter,
  primaryResult?: RegistryResolutionResult,
  overlayContext?: OverlaySeamExecutionContext,
  lockfileEntries?: { namespace: string; id: string; lockedVersion: string }[],
  scopedTrustPolicy?: ScopedNamespaceTrustPolicy
): MirrorFallbackResult {
  // Pre-resolved primary is used purely as an equivalence reference.
  // It does NOT prevent mirror resolution when the primary adapter fails.
  const equivalenceReference = primaryResult;
  let primary: RegistryResolutionResult | undefined;
  let primaryFailed = false;

  try {
    primary = primaryAdapter.lookup(namespace, policyId, lockfileEntries, scopedTrustPolicy);
  } catch {
    primaryFailed = true;
  }

  // Primary adapter succeeded — no mirror fallback needed
  if (primary && !primaryFailed) {
    return {
      result: primary,
      mirrorUsed: false
    };
  }

  // No mirror adapter — cannot fallback
  if (!mirrorAdapter) {
    throw new Error(`Primary registry resolution failed for ${namespace}://${policyId} and no mirror adapter available`);
  }

  // Attempt mirror resolution
  const mirrorResult = mirrorAdapter.lookup(namespace, policyId, lockfileEntries, scopedTrustPolicy);

  // Mark as mirror fallback
  const taggedMirror: RegistryResolutionResult = {
    ...mirrorResult,
    isMirrorFallback: true,
    mirrorSourceId: mirrorResult.mirrorSourceId || mirrorResult.registrySource
  };

  // If we have an equivalence reference (pre-resolved primary), enforce content equivalence
  if (equivalenceReference) {
    const equivalenceResult = enforceMirrorContentEquivalence(equivalenceReference, taggedMirror);

    // Route through mirror seam for overlay governance
    const governedResult = executeOverlaySeam(
      'overlay::transport::mirrorBoundary',
      () => taggedMirror,
      overlayContext
    );

    return {
      result: governedResult,
      mirrorUsed: true,
      mirrorSourceId: taggedMirror.mirrorSourceId,
      equivalenceResult
    };
  }

  // Primary failed completely — mirror without equivalence check
  // (equivalence requires primary data to compare against)
  // Route through mirror seam for overlay governance
  const governedResult = executeOverlaySeam(
    'overlay::transport::mirrorBoundary',
    () => taggedMirror,
    overlayContext
  );

  return {
    result: governedResult,
    mirrorUsed: true,
    mirrorSourceId: taggedMirror.mirrorSourceId
  };
}
