import { SeamMergeMode, OverlayAuthorityTier, OverlayActivationContext, OverlaySeamRunState } from './seamContracts.js';
import * as crypto from 'node:crypto';

export const TELEMETRY_SCHEMA_VERSION = 1;

export interface OverlaySeamExecutionRecord {
  readonly telemetrySchemaVersion?: number;
  seamId: string;
  mergeMode: SeamMergeMode;
  overlaySourceId: string;
  overlayVersion: string;
  authorityTier: OverlayAuthorityTier;
  activationDecision: 'EXECUTED' | 'BYPASSED' | 'REJECTED';
  conflictDetected: boolean;
  resolutionOutcome?: string;
  hashParticipationEnabled: boolean;
  // Stack-position metadata is observational telemetry only.
  // It MUST NOT influence closure-hash identity.
  readonly stackPosition?: number;
  readonly stackSize?: number;
  // F-1: Per-handler identity provenance.
  // These fields record the handler-level identity envelope for forensic reconstruction.
  // They MUST NOT influence closure-hash identity.
  readonly handlerOverlaySourceId?: string;
  readonly handlerOverlayVersion?: string;
  readonly handlerOverlaySignaturePresent?: boolean;
  // F-2: Per-seam authority grant telemetry.
  // These fields record seam-grant resolution state for forensic reconstruction.
  // They MUST NOT influence closure-hash identity.
  readonly seamGrantPresent?: boolean;
  readonly seamGrantMaxTier?: import('./seamContracts.js').OverlayAuthorityTier;
  readonly seamGrantAllowsMergeMode?: boolean;
  // F-3: Signature verification telemetry.
  // These fields record signature gate resolution state for forensic reconstruction.
  // They MUST NOT influence closure-hash identity.
  readonly signaturePresent?: boolean;
  readonly signatureValid?: boolean;
  readonly signatureVerificationMode?: 'missing' | 'bypass' | 'verified' | 'invalid' | 'untrusted-root' | 'unknown-algorithm';
  // F-6: Extended signature telemetry.
  // These fields record cryptographic verification state for forensic reconstruction.
  // They MUST NOT influence closure-hash identity.
  readonly signatureKeyId?: string;
  readonly signatureAlgorithm?: string;
  readonly signatureTrustRoot?: string;
  readonly signatureEnvelopeValid?: boolean;
  readonly signedPayloadDigest?: string;
  // F-4: DEBUG ONLY — sort trace key.
  // stackSortKey is observational telemetry only.
  // It MUST NEVER participate in fingerprint identity,
  // closure hash input, replay proofs, or authority decisions.
  // Emission is controlled by DEBUG_SORT_TRACE flag (disabled by default).
  readonly stackSortKey?: readonly unknown[];
  // F-5: Mirror fallback telemetry.
  // These fields record mirror path provenance for forensic reconstruction.
  // They MUST NOT influence closure-hash identity.
  readonly mirrorSourceId?: string;
  readonly mirrorFallbackUsed?: boolean;
  readonly mirrorEquivalenceVerified?: boolean;
}

export function recordSeamExecutionTelemetry(
  activationContext: OverlayActivationContext | undefined,
  runState: OverlaySeamRunState | undefined,
  record: OverlaySeamExecutionRecord
): void {
  // If no run state exists, we silently bypass telemetry capture
  // This ensures telemetry append operations do not mutate core pipeline execution when overlays are not run tracking
  if (!runState || !runState.telemetry) {
    return;
  }

  try {
    // Construct versioned record with telemetry schema provenance baked into the literal.
    // This replaces post-construction mutation to ensure structural correctness before freeze.
    const versionedRecord: OverlaySeamExecutionRecord = {
      telemetrySchemaVersion: TELEMETRY_SCHEMA_VERSION,
      seamId: record.seamId,
      overlaySourceId: record.overlaySourceId,
      overlayVersion: record.overlayVersion,
      mergeMode: record.mergeMode,
      authorityTier: record.authorityTier,
      activationDecision: record.activationDecision,
      conflictDetected: record.conflictDetected,
      resolutionOutcome: record.resolutionOutcome,
      hashParticipationEnabled: record.hashParticipationEnabled,
      stackPosition: record.stackPosition,
      stackSize: record.stackSize,
      handlerOverlaySourceId: record.handlerOverlaySourceId,
      handlerOverlayVersion: record.handlerOverlayVersion,
      handlerOverlaySignaturePresent: record.handlerOverlaySignaturePresent,
      seamGrantPresent: record.seamGrantPresent,
      seamGrantMaxTier: record.seamGrantMaxTier,
      seamGrantAllowsMergeMode: record.seamGrantAllowsMergeMode,
      signaturePresent: record.signaturePresent,
      signatureValid: record.signatureValid,
      signatureVerificationMode: record.signatureVerificationMode,
      // F-6: Extended signature telemetry — observational, never hashed.
      signatureKeyId: record.signatureKeyId,
      signatureAlgorithm: record.signatureAlgorithm,
      signatureTrustRoot: record.signatureTrustRoot,
      signatureEnvelopeValid: record.signatureEnvelopeValid,
      signedPayloadDigest: record.signedPayloadDigest,
      // F-4 DEBUG ONLY: stackSortKey — observational, never hashed.
      stackSortKey: record.stackSortKey,
      // F-5: Mirror provenance — observational, never hashed.
      mirrorSourceId: record.mirrorSourceId,
      mirrorFallbackUsed: record.mirrorFallbackUsed,
      mirrorEquivalenceVerified: record.mirrorEquivalenceVerified
    };

    // P-3: Freeze telemetry record at insertion time.
    // Prevents downstream handlers from retroactively mutating their own telemetry entries.
    Object.freeze(versionedRecord);

    // Append immutable telemetry observation
    runState.telemetry.push(versionedRecord);

    // If deterministic closure hashing holds for this context, append fingerprint deterministically
    // P-5: Include authorityTier in fingerprint hash input for replay-sensitive authority tracking
    if (activationContext?.includeSeamExecutionInClosureHash === true && versionedRecord.activationDecision === 'EXECUTED') {
      // IMPORTANT DETERMINISM INVARIANT:
      //
      // Fingerprint identity MUST derive exclusively from the frozen
      // telemetry record (versionedRecord) rather than mutable execution
      // parameters.
      //
      // This guarantees canonical replay determinism once multi-overlay
      // stacking algebra introduces handler-chain normalization and
      // provenance envelope participation.
      //
      // DO NOT source fingerprint identity from pre-freeze execution inputs.
      // FINGERPRINT IDENTITY EXCLUSION LIST:
      // The following fields are EXCLUDED from fingerprint hash input by design:
      //   - stackPosition, stackSize (observational)
      //   - handlerOverlaySourceId, handlerOverlayVersion, handlerOverlaySignaturePresent (F-1 provenance)
      //   - seamGrantPresent, seamGrantMaxTier, seamGrantAllowsMergeMode (F-2 provenance)
      //   - signaturePresent, signatureValid, signatureVerificationMode (F-3 provenance)
      //   - signatureKeyId, signatureAlgorithm, signatureTrustRoot, signatureEnvelopeValid, signedPayloadDigest (F-6 provenance)
      //   - stackSortKey (F-4 debug trace — MUST NEVER be hashed)
      //   - mirrorSourceId, mirrorFallbackUsed, mirrorEquivalenceVerified (F-5 provenance)
      //   - trustRootEpoch (F-8 provenance)
      // trustRootEpoch is lifecycle metadata only.
      // It MUST NOT participate in closure identity, fingerprint identity,
      // replay acceptance logic, or closure hash computation.
      const hashStr = [
        versionedRecord.seamId,
        versionedRecord.overlaySourceId,
        versionedRecord.overlayVersion,
        versionedRecord.mergeMode,
        String(versionedRecord.authorityTier)
      ].join('|');

      const fingerprint = crypto.createHash('sha256').update(hashStr).digest('hex');
      runState.seamHashFingerprints.push(fingerprint);
    }
  } catch (error) {
    // P-4 + Patch B: Structured telemetry error capture with precision-narrowed TypeError filter.
    // Only TypeError from frozen-array push (non-extensible object) is silently tolerated.
    // All other TypeErrors and all other error types are accumulated for forensic analysis.
    if (
      error instanceof TypeError &&
      /extensible|Cannot add property/i.test(String(error.message))
    ) {
      // Expected: push() on a frozen telemetry array. Silently tolerate.
      return;
    }
    if (!runState.telemetryErrors) {
      runState.telemetryErrors = [];
    }
    runState.telemetryErrors.push(
      `Telemetry capture failure for seam ${record.seamId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
