import { SEMVER_SELECTION_CONTRACT_VERSION, resolveSemverCandidate, MockSemverCandidate } from '../policy/contracts/semverSelectionContract.js';
import { resolveWithLockfile } from '../policy/contracts/lockfileResolutionContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

/**
 * Phase 4.8 Hardening:
 * - Explicitly rejects version ranges until proper range matching is implemented (audit finding H9/13.1)
 * - Ranges are detected by the URI parser but cannot be resolved by the semver selector
 */
const RANGE_PATTERN = /[\^~><= ]|\.x|\*/;

export function selectPolicyVersion(
  namespace: string,
  policyId: string,
  availableVersions: string[],
  versionRange?: string,
  lockfileEntries?: { namespace: string; id: string; lockedVersion: string }[]
): string {

  // Phase 4.8 Fix: Reject version ranges explicitly
  if (versionRange && RANGE_PATTERN.test(versionRange)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SEMVER_RANGE_NOT_SUPPORTED,
      message: `SemVer range matching not yet supported: "${versionRange}" for ${namespace}/${policyId}. Use exact versions or lockfile pinning.`,
      policyId,
      policyNamespace: namespace,
      contractVersion: SEMVER_SELECTION_CONTRACT_VERSION
    });
  }

  let lockedVersion: string | undefined = undefined;
  if (lockfileEntries) {
    lockedVersion = resolveWithLockfile(namespace, policyId, undefined, lockfileEntries);
  }

  // Determine candidates
  const candidates: MockSemverCandidate[] = (availableVersions || []).map(v => ({
    version: v,
    source: (lockedVersion === v) ? 'lockfile' : 'registry'
  }));

  const resolved = resolveSemverCandidate(lockedVersion, versionRange, candidates);

  if (!resolved) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SEMVER_SELECTION_FAILED,
      message: `SemVer Selection Failed for ${namespace}/${policyId}`,
      policyId,
      policyNamespace: namespace,
      contractVersion: SEMVER_SELECTION_CONTRACT_VERSION
    });
  }

  return resolved.version;
}
