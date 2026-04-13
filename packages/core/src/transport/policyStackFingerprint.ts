import * as crypto from 'node:crypto';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { PolicyStackFingerprint, POLICY_STACK_FINGERPRINT_VERSION } from './types.js';

/**
 * Phase 4.9: Compute PolicyStackFingerprint (unchanged)
 *
 * Composite identity derived from closureGraphHash + trustScopeHash + trustPolicyHash.
 * Provides a single comparison point for cross-snapshot equality.
 */
export function computePolicyStackFingerprint(
  closureGraphHash: string,
  trustScopeHash: string,
  trustPolicyHash: string
): PolicyStackFingerprint {
  const payload = {
    closureGraphHash,
    trustPolicyHash,
    trustScopeHash
  };
  const canonicalString = stableCanonicalStringify(payload);
  const fingerprint = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return {
    closureGraphHash,
    trustScopeHash,
    trustPolicyHash,
    fingerprint,
    fingerprintVersion: POLICY_STACK_FINGERPRINT_VERSION
  };
}

/**
 * Phase 4.10 Task 5: Extended PolicyStackFingerprint
 *
 * Adds manifestDigestSetHash to the fingerprint input for planner cache
 * invalidation correctness and manifest drift detection.
 *
 * Does NOT replace existing fingerprint — this is an additional surface.
 */
export const EXTENDED_FINGERPRINT_VERSION = 'v1';

export function computeExtendedPolicyStackFingerprint(
  closureGraphHash: string,
  trustScopeHash: string,
  trustPolicyHash: string,
  manifestDigestSetHash: string
): string {
  const payload = {
    closureGraphHash,
    manifestDigestSetHash,
    trustPolicyHash,
    trustScopeHash
  };
  const canonicalString = stableCanonicalStringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
