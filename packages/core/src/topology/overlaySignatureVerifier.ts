/**
 * F-6: Overlay signature verification contract.
 *
 * Provides cryptographic signature verification for overlay handlers.
 * Replaces the F-3 placeholder "sig:" prefix gate with structured
 * envelope parsing, trust-root resolution, and backend verification.
 *
 * Verification flow:
 *   1. Check signature presence
 *   2. Parse signature envelope (base64 JSON)
 *   3. Resolve registry trust root
 *   4. Compute expected payload digest
 *   5. Verify signature via backend
 *
 * Legacy "sig:" prefix signatures are treated as 'invalid' by default
 * unless ALLOW_LEGACY_SIGNATURES is explicitly enabled.
 */

import { parseOverlaySignatureEnvelope, computeSignedPayloadDigest } from './overlaySignatureEnvelope.js';
import { resolveRegistryTrustRoot } from './registryTrustStore.js';
import { resolveActiveTrustRoot } from './registryTrustLifecycle.js';
import { verifySignatureEnvelope } from './signatureVerificationBackend.js';

export interface OverlaySignatureVerificationInput {
  readonly overlaySourceId: string;
  readonly overlayVersion: string;
  readonly overlaySignature?: string;
  readonly overlayRegistrySource?: string;
  readonly manifestHash?: string;
}

export type SignatureVerificationMode =
  | 'missing'
  | 'bypass'
  | 'verified'
  | 'invalid'
  | 'untrusted-root'
  | 'unknown-algorithm';

export interface OverlaySignatureVerificationResult {
  readonly signaturePresent: boolean;
  readonly signatureValid: boolean;
  readonly verificationMode: SignatureVerificationMode;
  readonly rejectionReason?: string;
  readonly signatureKeyId?: string;
  readonly signatureAlgorithm?: string;
  readonly signatureTrustRoot?: string;
  readonly signatureEnvelopeValid?: boolean;
  readonly signedPayloadDigest?: string;
}

/**
 * Legacy signature backward compatibility flag.
 * When true, "sig:" prefix signatures are treated as 'verified'.
 * Default: false (legacy signatures are 'invalid').
 */
export let ALLOW_LEGACY_SIGNATURES = false;

export function setAllowLegacySignatures(allow: boolean): void {
  ALLOW_LEGACY_SIGNATURES = allow;
}

export function verifyOverlaySignature(
  input: OverlaySignatureVerificationInput
): OverlaySignatureVerificationResult {
  // Rule 1: Missing or empty signature
  if (!input.overlaySignature || input.overlaySignature.length === 0) {
    return {
      signaturePresent: false,
      signatureValid: false,
      verificationMode: 'missing',
      rejectionReason: `Signature missing for overlay ${input.overlaySourceId}@${input.overlayVersion}`,
      signatureEnvelopeValid: false
    };
  }

  // Rule 2: Legacy "sig:" prefix detection
  if (input.overlaySignature.startsWith('sig:')) {
    if (ALLOW_LEGACY_SIGNATURES) {
      return {
        signaturePresent: true,
        signatureValid: true,
        verificationMode: 'verified',
        signatureKeyId: 'legacy',
        signatureAlgorithm: 'legacy',
        signatureEnvelopeValid: false,
        signedPayloadDigest: '__legacy__' // strictly legacy mode bypass
      };
    }
    return {
      signaturePresent: true,
      signatureValid: false,
      verificationMode: 'invalid',
      rejectionReason: `Legacy signature format rejected for ${input.overlaySourceId}@${input.overlayVersion} — envelope format required`,
      signatureKeyId: 'legacy',
      signatureAlgorithm: 'legacy',
      signatureEnvelopeValid: false
    };
  }

  // Rule 3: Parse structured envelope
  const envelope = parseOverlaySignatureEnvelope(input.overlaySignature);
  if (!envelope) {
    return {
      signaturePresent: true,
      signatureValid: false,
      verificationMode: 'invalid',
      rejectionReason: `Signature envelope parsing failed for ${input.overlaySourceId}@${input.overlayVersion}`,
      signatureEnvelopeValid: false
    };
  }

  // Rule 4: Resolve trust root for registry
  const registrySource = input.overlayRegistrySource || 'external';
  const trustRoot = resolveActiveTrustRoot(registrySource);

  if (!trustRoot) {
    return {
      signaturePresent: true,
      signatureValid: false,
      verificationMode: 'untrusted-root',
      rejectionReason: `No trust root found for registry '${registrySource}'`,
      signatureKeyId: envelope.keyId,
      signatureAlgorithm: envelope.algorithm,
      signatureEnvelopeValid: true
    };
  }

  // Rule 5: Compute expected payload digest
  const expectedDigest = computeSignedPayloadDigest(
    input.overlaySourceId,
    input.overlayVersion,
    input.manifestHash
  );

  // Rule 6: Verify via backend
  const backendResult = verifySignatureEnvelope(
    envelope,
    expectedDigest,
    trustRoot,
    input.overlaySourceId,
    input.overlayVersion
  );

  if (!backendResult.verified) {
    const modeMap: Record<string, SignatureVerificationMode> = {
      'untrusted-key': 'untrusted-root',
      'unknown-algorithm': 'unknown-algorithm',
      'digest-mismatch': 'invalid',
      'invalid-signature': 'invalid',
      'replay-detected': 'invalid'
    };

    return {
      signaturePresent: true,
      signatureValid: false,
      verificationMode: modeMap[backendResult.outcome] || 'invalid',
      rejectionReason: backendResult.rejectionReason,
      signatureKeyId: backendResult.keyId,
      signatureAlgorithm: backendResult.algorithm,
      signatureTrustRoot: trustRoot.registryId,
      signatureEnvelopeValid: true,
      signedPayloadDigest: envelope.signedPayloadDigest
    };
  }

  return {
    signaturePresent: true,
    signatureValid: true,
    verificationMode: 'verified',
    signatureKeyId: backendResult.keyId,
    signatureAlgorithm: backendResult.algorithm,
    signatureTrustRoot: trustRoot.registryId,
    signatureEnvelopeValid: true,
    signedPayloadDigest: envelope.signedPayloadDigest
  };
}
