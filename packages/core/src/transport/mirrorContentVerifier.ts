/**
 * F-5: Mirror Content Verification.
 *
 * Enforces content equivalence between primary and mirror registry results
 * before accepting a mirror fallback. This prevents mirror drift attacks
 * where a compromised mirror serves modified manifests.
 *
 * Verification checks:
 *   1. Namespace identity match
 *   2. Policy ID match
 *   3. Version set equivalence
 *   4. Manifest content equivalence (per available version)
 *
 * If equivalence cannot be proven, mirror fallback is rejected.
 */

import { RegistryResolutionResult } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import * as crypto from 'node:crypto';

export interface MirrorEquivalenceResult {
  readonly equivalent: boolean;
  readonly mirrorSourceId: string;
  readonly rejectionReason?: string;
  readonly primaryManifestHash: string;
  readonly mirrorManifestHash: string;
}

/**
 * Compute a deterministic content hash for a registry resolution result's manifests.
 *
 * Uses stableCanonicalStringify to ensure key ordering is deterministic.
 */
export function computeManifestContentHash(result: RegistryResolutionResult): string {
  const sortedVersions = [...result.availableVersions].sort();
  const payload: Record<string, any> = {};
  for (const version of sortedVersions) {
    if (result.manifests[version]) {
      payload[version] = result.manifests[version];
    }
  }
  return crypto.createHash('sha256')
    .update(stableCanonicalStringify(payload))
    .digest('hex');
}

/**
 * Verify content equivalence between a primary and mirror registry result.
 *
 * Returns a structured result indicating whether the mirror content matches
 * the primary content. This is a pure, side-effect-free function.
 */
export function verifyMirrorEquivalence(
  primary: RegistryResolutionResult,
  mirror: RegistryResolutionResult
): MirrorEquivalenceResult {
  const mirrorSourceId = mirror.mirrorSourceId || mirror.registrySource || 'unknown-mirror';
  const primaryHash = computeManifestContentHash(primary);
  const mirrorHash = computeManifestContentHash(mirror);

  // 1. Namespace identity must match
  if (primary.namespace !== mirror.namespace) {
    return {
      equivalent: false,
      mirrorSourceId,
      rejectionReason: `Namespace mismatch: primary=${primary.namespace}, mirror=${mirror.namespace}`,
      primaryManifestHash: primaryHash,
      mirrorManifestHash: mirrorHash
    };
  }

  // 2. Policy ID must match
  if (primary.policyId !== mirror.policyId) {
    return {
      equivalent: false,
      mirrorSourceId,
      rejectionReason: `Policy ID mismatch: primary=${primary.policyId}, mirror=${mirror.policyId}`,
      primaryManifestHash: primaryHash,
      mirrorManifestHash: mirrorHash
    };
  }

  // 3. Version set equivalence
  const primaryVersions = [...primary.availableVersions].sort();
  const mirrorVersions = [...mirror.availableVersions].sort();
  if (primaryVersions.length !== mirrorVersions.length ||
      !primaryVersions.every((v, i) => v === mirrorVersions[i])) {
    return {
      equivalent: false,
      mirrorSourceId,
      rejectionReason: `Version set mismatch: primary=[${primaryVersions}], mirror=[${mirrorVersions}]`,
      primaryManifestHash: primaryHash,
      mirrorManifestHash: mirrorHash
    };
  }

  // 4. Manifest content equivalence (canonical hash comparison)
  if (primaryHash !== mirrorHash) {
    return {
      equivalent: false,
      mirrorSourceId,
      rejectionReason: `Manifest content divergence: primary hash ${primaryHash.substring(0, 12)}... !== mirror hash ${mirrorHash.substring(0, 12)}...`,
      primaryManifestHash: primaryHash,
      mirrorManifestHash: mirrorHash
    };
  }

  return {
    equivalent: true,
    mirrorSourceId,
    primaryManifestHash: primaryHash,
    mirrorManifestHash: mirrorHash
  };
}

/**
 * Enforce mirror content equivalence. Throws if mirror content does not match primary.
 *
 * This is the enforcement gate — it converts a verification result into a hard rejection.
 */
export function enforceMirrorContentEquivalence(
  primary: RegistryResolutionResult,
  mirror: RegistryResolutionResult
): MirrorEquivalenceResult {
  const result = verifyMirrorEquivalence(primary, mirror);

  if (!result.equivalent) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.MIRROR_NAMESPACE_DIVERGENCE,
      message: `Mirror content verification failed: ${result.rejectionReason}`,
      stage: 'mirrorContentVerification',
      policyNamespace: primary.namespace,
      mirrorNamespace: mirror.mirrorSourceId || mirror.registrySource,
      loaderStageMetadata: {
        contractVersion: 'F-5',
        primaryManifestHash: result.primaryManifestHash,
        mirrorManifestHash: result.mirrorManifestHash,
        validationStage: 'enforceMirrorContentEquivalence'
      }
    });
  }

  return result;
}
