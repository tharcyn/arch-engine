/**
 * F-6: Overlay Signature Envelope.
 *
 * Defines the structured envelope format for overlay handler signatures.
 * Replaces the F-3 placeholder "sig:" prefix with a base64 JSON envelope.
 *
 * Envelope contains:
 *   - algorithm: cryptographic algorithm used
 *   - keyId: identifier of the signing key (maps to trust store public key)
 *   - signature: base64-encoded digital signature
 *   - signedPayloadDigest: SHA-256 hex digest of the canonical signed payload
 *
 * Payload digest includes: overlaySourceId + overlayVersion + manifestHash
 * Payload digest does NOT include: mergeMode, authorityTier, stack position
 */

import * as crypto from 'node:crypto';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';

export type SignatureAlgorithm = 'ed25519' | 'rsa-pss';

export interface OverlaySignatureEnvelope {
  readonly algorithm: SignatureAlgorithm;
  readonly keyId: string;
  readonly signature: string;
  readonly signedPayloadDigest: string;
}

/**
 * Parse a signature string into a structured envelope.
 *
 * Expected format: base64-encoded JSON string containing all envelope fields.
 *
 * Returns undefined if parsing fails or the envelope is structurally invalid.
 */
export function parseOverlaySignatureEnvelope(
  signatureString: string | undefined
): OverlaySignatureEnvelope | undefined {
  if (!signatureString || signatureString.length === 0) {
    return undefined;
  }

  // Legacy "sig:" prefix detection — not a valid envelope
  if (signatureString.startsWith('sig:')) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(signatureString, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    // Structural validation
    if (
      typeof parsed.algorithm !== 'string' ||
      typeof parsed.keyId !== 'string' ||
      typeof parsed.signature !== 'string' ||
      typeof parsed.signedPayloadDigest !== 'string'
    ) {
      return undefined;
    }

    // Algorithm validation
    if (parsed.algorithm !== 'ed25519' && parsed.algorithm !== 'rsa-pss') {
      return undefined;
    }

    return Object.freeze({
      algorithm: parsed.algorithm as SignatureAlgorithm,
      keyId: parsed.keyId,
      signature: parsed.signature,
      signedPayloadDigest: parsed.signedPayloadDigest
    });
  } catch {
    return undefined;
  }
}

/**
 * Compute the canonical payload digest for signature verification.
 *
 * Includes: overlaySourceId, overlayVersion, manifestHash
 * Excludes: mergeMode, authorityTier, stack position
 *
 * Deterministic across registries.
 */
export function computeSignedPayloadDigest(
  overlaySourceId: string,
  overlayVersion: string,
  manifestHash?: string
): string {
  const payload = stableCanonicalStringify({
    overlaySourceId,
    overlayVersion,
    manifestHash: manifestHash || 'none'
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Create a signature envelope string (base64-encoded JSON).
 * Utility for test and signing tooling.
 */
export function createSignatureEnvelopeString(
  envelope: OverlaySignatureEnvelope
): string {
  const json = JSON.stringify({
    algorithm: envelope.algorithm,
    keyId: envelope.keyId,
    signature: envelope.signature,
    signedPayloadDigest: envelope.signedPayloadDigest
  });
  return Buffer.from(json, 'utf-8').toString('base64');
}
