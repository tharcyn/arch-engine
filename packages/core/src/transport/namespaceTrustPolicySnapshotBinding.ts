import * as crypto from 'node:crypto';
import { NamespaceTrustPolicy } from './namespaceTrustPolicy.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';

export const NAMESPACE_TRUST_POLICY_SNAPSHOT_VERSION = 'v1';

export function computeNamespaceTrustPolicyHash(policy: NamespaceTrustPolicy): string {
  // Stable key ordering
  const mirrorKeys = policy.mirrorEquivalenceMap
    ? Object.keys(policy.mirrorEquivalenceMap).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    : [];

  const mirrorEntries = mirrorKeys.map(k => [k, policy.mirrorEquivalenceMap![k]]);

  const normalized = {
    allowUntrustedNamespaces: policy.allowUntrustedNamespaces ?? false,
    mirrorEquivalenceMap: mirrorEntries.length > 0 ? Object.fromEntries(mirrorEntries) : undefined,
    // Sort array
    trustedNamespaces: [...policy.trustedNamespaces].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  };

  // Phase 4.9: Use stableCanonicalStringify for mechanically enforced key ordering
  const canonicalString = stableCanonicalStringify(normalized);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function validateTrustPolicySnapshot(
  snapshotHash: string,
  runtimeHash: string
): void {
  if (snapshotHash !== runtimeHash) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.TRUST_POLICY_SNAPSHOT_DIVERGENCE,
      message: 'Trust policy signature in snapshot diverged from current runtime environment.',
      stage: 'snapshotReplayValidation',
      contractVersion: NAMESPACE_TRUST_POLICY_SNAPSHOT_VERSION,
      snapshotTrustPolicyHash: snapshotHash
    });
  }
}
