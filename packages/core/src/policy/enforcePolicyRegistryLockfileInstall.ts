import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from './PolicyRegistryLockfile';
import { verifyPolicyRegistryLockfileSignature } from './verifyPolicyRegistryLockfileSignature';
import { assessPolicyRegistryLockfileFreshness } from './assessPolicyRegistryLockfileFreshness';
import type { LockfileTrustStore } from './LockfileTrustStore';
import type { LockfileInstallEnforcementDiagnostic, LockfileEnforcementMode } from './LockfileInstallEnforcementDiagnostic';
import { assessDatasetRuntimeCompatibility } from './assessDatasetRuntimeCompatibility';
import type { ExternalTopologyDataset } from '../topology/external-topology-types';

import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig';

export function enforcePolicyRegistryLockfileInstall(
  trustConfig: TrustPolicyConfig,
  lockfilePath: string,
  lockfile: PolicyRegistryLockfile | undefined,
  liveRegistries: PolicyRegistryLockEntry[],
  trustStore?: LockfileTrustStore,
  activeDatasetIdentity?: PolicyRegistryLockfile['datasetIdentity'],
  activeCapabilityManifest?: Record<string, boolean>,
  activeMutationClassRegistry?: Record<string, unknown>,
  activeAuthorityScopeRegistry?: Record<string, unknown>,
  activeSurfaceConfidenceRegistry?: Record<string, unknown>,
  activeTrustBoundaryRules?: Record<string, unknown>,
  activeDataset?: ExternalTopologyDataset
): LockfileInstallEnforcementDiagnostic {
  const mode = trustConfig.enforcementMode || 'permissive';
  const lockfilePresent = !!lockfile;
  const signaturePresent = lockfilePresent && !!lockfile.signature;
  const signerKeyId = lockfile?.signatureKeyId;

  if (mode === 'permissive') {
    return {
      allowed: true,
      mode,
      lockfilePresent,
      signaturePresent,
      signerKeyId,
      message: 'Permissive mode allows execution'
    };
  }

  if (!lockfilePresent) {
    return {
      allowed: false,
      mode,
      lockfilePresent,
      signaturePresent,
      failureReason: 'MISSING_LOCKFILE',
      message: 'Lockfile is required for execution but is missing'
    };
  }

  if (!signaturePresent) {
    return {
      allowed: false,
      mode,
      lockfilePresent,
      signaturePresent,
      failureReason: 'MISSING_SIGNATURE',
      message: 'Lockfile signature is required but missing'
    };
  }

  if (!trustStore) {
    throw new Error('Trust store must be provided for signature verification');
  }

  const verificationResult = verifyPolicyRegistryLockfileSignature(lockfilePath, trustConfig, trustStore);
  if (!verificationResult.verified) {
    return {
      allowed: false,
      mode,
      lockfilePresent,
      signaturePresent,
      verificationSuccess: false,
      signerKeyId,
      failureReason: verificationResult.diagnostic.failureReason ?? 'INVALID_SIGNATURE',
      message: `Lockfile signature verification failed: ${verificationResult.diagnostic.message}`,
      verificationDiagnostic: verificationResult.diagnostic
    };
  }

  if (mode === 'require-signature-and-freshness') {
    const freshness = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile, activeDatasetIdentity, activeCapabilityManifest, activeMutationClassRegistry, activeAuthorityScopeRegistry, activeSurfaceConfidenceRegistry, activeTrustBoundaryRules);
    if (!freshness.isFresh) {
      return {
        allowed: false,
        mode,
        lockfilePresent,
        signaturePresent,
        verificationSuccess: true,
        freshnessSuccess: false,
        signerKeyId,
        failureReason: 'STALE_LOCKFILE',
        message: 'Lockfile is trusted but stale relative to live registries',
        verificationDiagnostic: verificationResult.diagnostic
      };
    }
    
    if (activeDataset) {
      const compatibility = assessDatasetRuntimeCompatibility(activeDataset);
      if (compatibility.overallStatus === 'incompatible') {
        return {
          allowed: false,
          mode,
          lockfilePresent,
          signaturePresent,
          verificationSuccess: true,
          freshnessSuccess: true,
          signerKeyId,
          failureReason: 'DATASET_INCOMPATIBLE',
          message: `Lockfile is trusted and fresh, but dataset is incompatible: ${compatibility.summaryMessage}`,
          verificationDiagnostic: verificationResult.diagnostic
        };
      }
    }

    return {
      allowed: true,
      mode,
      lockfilePresent,
      signaturePresent,
      verificationSuccess: true,
      freshnessSuccess: true,
      signerKeyId,
      message: 'Lockfile is trusted and fresh',
      verificationDiagnostic: verificationResult.diagnostic
    };
  }

  if (activeDataset) {
    const compatibility = assessDatasetRuntimeCompatibility(activeDataset);
    if (compatibility.overallStatus === 'incompatible' && mode === 'require-signature') {
      return {
        allowed: false,
        mode,
        lockfilePresent,
        signaturePresent,
        verificationSuccess: true,
        signerKeyId,
        failureReason: 'DATASET_INCOMPATIBLE',
        message: `Lockfile is trusted, but dataset is incompatible: ${compatibility.summaryMessage}`,
        verificationDiagnostic: verificationResult.diagnostic
      };
    }
  }

  return {
    allowed: true,
    mode,
    lockfilePresent,
    signaturePresent,
    verificationSuccess: true,
    signerKeyId,
    message: 'Lockfile is trusted',
    verificationDiagnostic: verificationResult.diagnostic
  };
}
