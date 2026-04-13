import { OverlaySeamExecutionContext, OverlayHandlerMetadata, OverlayAuthorityTier } from './seamContracts.js';
import { OverlaySeamError, SeamConflictCode } from '../errors/seamErrors.js';
import { validateSeamNamespace } from './seamNamespaceValidation.js';
import { resolveOverlayAuthority } from './overlayAuthorityResolver.js';
import { recordSeamExecutionTelemetry, OverlaySeamExecutionRecord } from './seamExecutionTelemetry.js';
import { sortOverlayHandlerStackByPrecedence } from './overlayHandlerSorter.js';

// Multi-overlay stacking algebra establishes deterministic seam
// composition across federated policy-pack environments. Execution
// ordering must remain stable across distributed registry mirrors.

/**
 * Deterministic merge-mode precedence ranking.
 * replace-if-authorized > merge-by-key > append
 * Higher number = higher authority precedence.
 */
const MERGE_MODE_PRECEDENCE: Record<string, number> = {
  'append': 1,
  'merge-by-key': 2,
  'replace-if-authorized': 3
};

/**
 * Sort an overlay handler stack into deterministic execution order.
 *
 * F-4: Delegates to canonical federation-portable sorting.
 * Produces identical stack order across repositories, registries,
 * mirrors, and transport seams.
 *
 * @deprecated Use sortOverlayHandlerStackByPrecedence directly for explicit control.
 */
export function sortOverlayHandlerStack(
  handlerStack: readonly OverlayHandlerMetadata[],
  contextAuthorityTier?: OverlayAuthorityTier
): readonly OverlayHandlerMetadata[] {
  return sortOverlayHandlerStackByPrecedence(handlerStack, contextAuthorityTier);
}

export function executeOverlaySeam<T>(
  seamIdentity: string,
  defaultAction: () => T,
  executionContext?: OverlaySeamExecutionContext
): T {
  // 1. Zero-Overlay Bypass Gate (Unmodified purity guarantee)
  // If no activation context is provided whatsoever, no seam metadata parsing or telemetry hooks are checked.
  if (!executionContext || !executionContext.activation || executionContext.activation.activeOverlays.length === 0) {
    return defaultAction();
  }

  const activationContext = executionContext.activation;
  const runState = executionContext.runState;
  
  // 2. Namespace Validation
  const seamContract = validateSeamNamespace(seamIdentity);

  // 3. Authority Resolution (context-level gate)
  const authResult = resolveOverlayAuthority(activationContext, seamContract.identity, seamContract.mergeMode);
  
  if (!authResult.trustAccepted) {
    recordSeamExecutionTelemetry(activationContext, runState, {
      seamId: seamContract.identity,
      mergeMode: seamContract.mergeMode,
      overlaySourceId: authResult.overlaySourceId,
      overlayVersion: authResult.overlayVersion,
      authorityTier: authResult.authorityTier,
      activationDecision: 'REJECTED',
      conflictDetected: true,
      resolutionOutcome: `Authorization failed: ${authResult.rejectionReason}`,
      hashParticipationEnabled: activationContext.includeSeamExecutionInClosureHash ?? false,
      seamGrantPresent: authResult.seamGrantMeta?.seamGrantPresent,
      seamGrantMaxTier: authResult.seamGrantMeta?.seamGrantMaxTier,
      seamGrantAllowsMergeMode: authResult.seamGrantMeta?.seamGrantAllowsMergeMode,
      signaturePresent: authResult.signatureVerificationMeta?.signaturePresent,
      signatureValid: authResult.signatureVerificationMeta?.signatureValid,
      signatureVerificationMode: authResult.signatureVerificationMeta?.signatureVerificationMode,
      signatureKeyId: authResult.signatureVerificationMeta?.signatureKeyId,
      signatureAlgorithm: authResult.signatureVerificationMeta?.signatureAlgorithm,
      signatureTrustRoot: authResult.signatureVerificationMeta?.signatureTrustRoot,
      signatureEnvelopeValid: authResult.signatureVerificationMeta?.signatureEnvelopeValid
    });
    
    throw new OverlaySeamError(
      SeamConflictCode.SEAM_UNAUTHORIZED_OVERRIDE,
      `Seam ${seamContract.identity} authorization failed: ${authResult.rejectionReason}`
    );
  }

  // Pure core fetch pre-requisite.
  const pureCoreResult = defaultAction();

  // Resolve handler stack from seamOverrides.
  const handlerStack = activationContext.seamOverrides?.[seamContract.identity];

  // No handlers registered — bypass with telemetry.
  if (!handlerStack || handlerStack.length === 0) {
    recordSeamExecutionTelemetry(activationContext, runState, {
      seamId: seamContract.identity,
      mergeMode: seamContract.mergeMode,
      overlaySourceId: authResult.overlaySourceId,
      overlayVersion: authResult.overlayVersion,
      authorityTier: authResult.authorityTier,
      activationDecision: 'BYPASSED',
      conflictDetected: false,
      resolutionOutcome: `No handler registered for active seam`,
      hashParticipationEnabled: false // Excluded because no overlay was executed actually.
    });
    return pureCoreResult;
  }

  // 4. Deterministic handler stack sorting (F-4: canonical federation-portable precedence)
  const sortedStack = sortOverlayHandlerStack(handlerStack, authResult.authorityTier);
  const stackSize = sortedStack.length;

  // 5. Execute handlers sequentially through merge algebra
  let finalResult = pureCoreResult;

  for (let handlerIndex = 0; handlerIndex < stackSize; handlerIndex++) {
    const handlerMeta = sortedStack[handlerIndex];

    // F-1: Per-handler identity binding.
    // Authority resolution uses handler-level identity when available.
    // Activation context identity is fallback only.
    const handlerAuthResult = resolveOverlayAuthority(
      activationContext,
      seamContract.identity,
      seamContract.mergeMode,
      {
        overlaySourceId: handlerMeta.overlaySourceId,
        overlayVersion: handlerMeta.overlayVersion,
        overlaySignature: handlerMeta.overlaySignature,
        overlayRegistrySource: handlerMeta.overlayRegistrySource
      }
    );

    if (!handlerAuthResult.trustAccepted) {
      recordSeamExecutionTelemetry(activationContext, runState, {
        seamId: seamContract.identity,
        mergeMode: seamContract.mergeMode,
        overlaySourceId: handlerAuthResult.overlaySourceId,
        overlayVersion: handlerAuthResult.overlayVersion,
        authorityTier: handlerAuthResult.authorityTier,
        activationDecision: 'REJECTED',
        conflictDetected: true,
        resolutionOutcome: `Handler ${handlerIndex} rejected: ${handlerAuthResult.rejectionReason}`,
        hashParticipationEnabled: activationContext.includeSeamExecutionInClosureHash ?? false,
        stackPosition: handlerIndex,
        stackSize,
        handlerOverlaySourceId: handlerMeta.overlaySourceId,
        handlerOverlayVersion: handlerMeta.overlayVersion,
        handlerOverlaySignaturePresent: handlerMeta.overlaySignature !== undefined,
        seamGrantPresent: handlerAuthResult.seamGrantMeta?.seamGrantPresent,
        seamGrantMaxTier: handlerAuthResult.seamGrantMeta?.seamGrantMaxTier,
        seamGrantAllowsMergeMode: handlerAuthResult.seamGrantMeta?.seamGrantAllowsMergeMode,
        signaturePresent: handlerAuthResult.signatureVerificationMeta?.signaturePresent,
        signatureValid: handlerAuthResult.signatureVerificationMeta?.signatureValid,
        signatureVerificationMode: handlerAuthResult.signatureVerificationMeta?.signatureVerificationMode,
        signatureKeyId: handlerAuthResult.signatureVerificationMeta?.signatureKeyId,
        signatureAlgorithm: handlerAuthResult.signatureVerificationMeta?.signatureAlgorithm,
        signatureTrustRoot: handlerAuthResult.signatureVerificationMeta?.signatureTrustRoot,
        signatureEnvelopeValid: handlerAuthResult.signatureVerificationMeta?.signatureEnvelopeValid,
        signedPayloadDigest: handlerAuthResult.signatureVerificationMeta?.signedPayloadDigest
      });
      // Skip this handler, continue stack execution
      continue;
    }

    // 6. Merge algebra execution per handler
    const previousResult = finalResult;

    if (seamContract.mergeMode === 'replace-if-authorized') {
      finalResult = handlerMeta.handler(previousResult);
    } else if (seamContract.mergeMode === 'merge-by-key') {
      finalResult = handlerMeta.handler(previousResult);
      const coreKeys = Object.keys(pureCoreResult as any);
      for (const key of coreKeys) {
        if ((finalResult as any)[key] === undefined) {
           throw new OverlaySeamError(
             SeamConflictCode.SEAM_CORE_INVARIANT_SHADOW_ATTEMPT,
             `Seam ${seamContract.identity} handler[${handlerIndex}] violated merge constraint: cannot delete core keys.`
           );
        }
      }
    } else if (seamContract.mergeMode === 'append') {
      finalResult = handlerMeta.handler(previousResult);
      if (!Array.isArray(previousResult) || !Array.isArray(finalResult)) {
          throw new OverlaySeamError(
              SeamConflictCode.SEAM_MERGE_VIOLATION,
              `Seam ${seamContract.identity} handler[${handlerIndex}] with 'append' mode must return array structures.`
          );
      }
      if (finalResult.length < previousResult.length) {
          throw new OverlaySeamError(
              SeamConflictCode.SEAM_MERGE_VIOLATION,
              `Seam ${seamContract.identity} handler[${handlerIndex}] cannot shorten an append array target.`
          );
      }
      // P-2: Append-mode content integrity enforcement.
      // Existing indices 0..previous.length-1 must remain referentially identical.
      // Only additions at indices >= previous.length are permitted.
      for (let i = 0; i < previousResult.length; i++) {
        if (finalResult[i] !== previousResult[i]) {
          throw new OverlaySeamError(
              SeamConflictCode.SEAM_MERGE_VIOLATION,
              `Seam ${seamContract.identity} handler[${handlerIndex}] violated append integrity: existing element at index ${i} was mutated.`
          );
        }
      }
    }

    // 7. Per-handler telemetry recording with handler-level identity provenance
    recordSeamExecutionTelemetry(activationContext, runState, {
      seamId: seamContract.identity,
      mergeMode: seamContract.mergeMode,
      overlaySourceId: handlerAuthResult.overlaySourceId,
      overlayVersion: handlerAuthResult.overlayVersion,
      authorityTier: handlerAuthResult.authorityTier,
      activationDecision: 'EXECUTED',
      conflictDetected: false,
      resolutionOutcome: `Merge mode ${seamContract.mergeMode} handler[${handlerIndex}] successfully applied`,
      hashParticipationEnabled: activationContext.includeSeamExecutionInClosureHash ?? false,
      stackPosition: handlerIndex,
      stackSize,
      handlerOverlaySourceId: handlerMeta.overlaySourceId,
      handlerOverlayVersion: handlerMeta.overlayVersion,
      handlerOverlaySignaturePresent: handlerMeta.overlaySignature !== undefined,
      seamGrantPresent: handlerAuthResult.seamGrantMeta?.seamGrantPresent,
      seamGrantMaxTier: handlerAuthResult.seamGrantMeta?.seamGrantMaxTier,
      seamGrantAllowsMergeMode: handlerAuthResult.seamGrantMeta?.seamGrantAllowsMergeMode,
      signaturePresent: handlerAuthResult.signatureVerificationMeta?.signaturePresent,
      signatureValid: handlerAuthResult.signatureVerificationMeta?.signatureValid,
      signatureVerificationMode: handlerAuthResult.signatureVerificationMeta?.signatureVerificationMode,
      signatureKeyId: handlerAuthResult.signatureVerificationMeta?.signatureKeyId,
      signatureAlgorithm: handlerAuthResult.signatureVerificationMeta?.signatureAlgorithm,
      signatureTrustRoot: handlerAuthResult.signatureVerificationMeta?.signatureTrustRoot,
      signatureEnvelopeValid: handlerAuthResult.signatureVerificationMeta?.signatureEnvelopeValid,
      signedPayloadDigest: handlerAuthResult.signatureVerificationMeta?.signedPayloadDigest
    });
  }

  return finalResult;
}
