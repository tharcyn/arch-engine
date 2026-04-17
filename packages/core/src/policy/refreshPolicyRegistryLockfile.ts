import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from './PolicyRegistryLockfile';
import type { LockfileRefreshDiagnostic } from './LockfileRefreshDiagnostic';
import { canonicalizeRegistryLockfilePayload } from './canonicalizeRegistryLockfilePayload';
import { signPolicyRegistryLockfile } from './signPolicyRegistryLockfile';
import type { LockfileSignerStore } from './LockfileSignerStore';

export interface RefreshPolicyRegistryLockfileResult {
  readonly success: boolean;
  readonly lockfile: PolicyRegistryLockfile;
  readonly diagnostic: LockfileRefreshDiagnostic;
}

export function refreshPolicyRegistryLockfile(
  liveRegistries: PolicyRegistryLockEntry[],
  existingLockfile: PolicyRegistryLockfile | undefined,
  signOptions?: {
    signatureKeyId: string;
    signerStore: LockfileSignerStore;
  },
  activeDatasetIdentity?: PolicyRegistryLockfile['datasetIdentity'],
  activeCapabilityManifest?: Record<string, boolean>,
  activeMutationClassRegistry?: Record<string, unknown>,
  activeAuthorityScopeRegistry?: Record<string, unknown>,
  activeSurfaceConfidenceRegistry?: Record<string, unknown>,
  activeTrustBoundaryRules?: Record<string, unknown>
): RefreshPolicyRegistryLockfileResult {
  let lockfile: PolicyRegistryLockfile = existingLockfile ?? {
    lockfileSurfaceVersion: '1.0.0',
    registries: []
  };

  const oldPayload = canonicalizeRegistryLockfilePayload(lockfile.registries);
  const newPayload = canonicalizeRegistryLockfilePayload(liveRegistries);
  
  const oldCapabilityStr = JSON.stringify(lockfile.datasetCapabilityManifest || {});
  const newCapabilityStr = JSON.stringify(activeCapabilityManifest || {});

  const oldMutationStr = JSON.stringify(lockfile.datasetMutationClassRegistry || {});
  const newMutationStr = JSON.stringify(activeMutationClassRegistry || {});

  const oldAuthorityStr = JSON.stringify(lockfile.datasetAuthorityScopeRegistry || {});
  const newAuthorityStr = JSON.stringify(activeAuthorityScopeRegistry || {});

  const oldConfidenceStr = JSON.stringify(lockfile.datasetSurfaceConfidenceRegistry || {});
  const newConfidenceStr = JSON.stringify(activeSurfaceConfidenceRegistry || {});

  const oldBoundaryStr = JSON.stringify(lockfile.datasetTrustBoundaryRules || {});
  const newBoundaryStr = JSON.stringify(activeTrustBoundaryRules || {});

  const driftDetected = oldPayload !== newPayload 
      || JSON.stringify(lockfile.datasetIdentity || {}) !== JSON.stringify(activeDatasetIdentity || {})
      || oldCapabilityStr !== newCapabilityStr
      || oldMutationStr !== newMutationStr
      || oldAuthorityStr !== newAuthorityStr
      || oldConfidenceStr !== newConfidenceStr
      || oldBoundaryStr !== newBoundaryStr;
  let signatureInvalidated = false;

  lockfile = {
    ...lockfile,
    registries: liveRegistries
  };

  if (activeDatasetIdentity) {
    lockfile = { ...lockfile, datasetIdentity: activeDatasetIdentity };
  } else if ('datasetIdentity' in lockfile) {
    const { datasetIdentity, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (activeCapabilityManifest) {
    lockfile = { ...lockfile, datasetCapabilityManifest: activeCapabilityManifest };
  } else if ('datasetCapabilityManifest' in lockfile) {
    const { datasetCapabilityManifest, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (activeMutationClassRegistry) {
    lockfile = { ...lockfile, datasetMutationClassRegistry: activeMutationClassRegistry };
  } else if ('datasetMutationClassRegistry' in lockfile) {
    const { datasetMutationClassRegistry, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (activeAuthorityScopeRegistry) {
    lockfile = { ...lockfile, datasetAuthorityScopeRegistry: activeAuthorityScopeRegistry };
  } else if ('datasetAuthorityScopeRegistry' in lockfile) {
    const { datasetAuthorityScopeRegistry, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (activeSurfaceConfidenceRegistry) {
    lockfile = { ...lockfile, datasetSurfaceConfidenceRegistry: activeSurfaceConfidenceRegistry };
  } else if ('datasetSurfaceConfidenceRegistry' in lockfile) {
    const { datasetSurfaceConfidenceRegistry, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (activeTrustBoundaryRules) {
    lockfile = { ...lockfile, datasetTrustBoundaryRules: activeTrustBoundaryRules };
  } else if ('datasetTrustBoundaryRules' in lockfile) {
    const { datasetTrustBoundaryRules, ...rest } = lockfile as any;
    lockfile = rest;
  }

  if (driftDetected && (lockfile.signature || lockfile.signatures)) {
    signatureInvalidated = true;
    const { signature, signatureKeyId, signatureAlgorithm, signatures, ...rest } = lockfile;
    lockfile = rest as PolicyRegistryLockfile;
  } else if (!driftDetected) {
    // Normalize and canonicalize existing signatures even if no drift
    let existingSignatures = lockfile.signatures ? [...lockfile.signatures] : [];
    if (!lockfile.signatures && lockfile.signature && lockfile.signatureKeyId && lockfile.signatureAlgorithm) {
        existingSignatures.push({
            signatureKeyId: lockfile.signatureKeyId,
            signatureAlgorithm: lockfile.signatureAlgorithm as 'ed25519',
            signature: lockfile.signature
        });
    }

    if (existingSignatures.length > 0) {
        // Deduplicate keeping first seen
        const seen = new Set<string>();
        const deduped = [];
        for (const s of existingSignatures) {
            if (!seen.has(s.signatureKeyId)) {
                seen.add(s.signatureKeyId);
                deduped.push(s);
            }
        }
        
        // Sort canonically
        deduped.sort((a, b) => a.signatureKeyId.localeCompare(b.signatureKeyId));
        
        lockfile = {
            ...lockfile,
            signature: undefined,
            signatureKeyId: undefined,
            signatureAlgorithm: undefined,
            signatures: deduped
        };
        
        delete (lockfile as any).signature;
        delete (lockfile as any).signatureKeyId;
        delete (lockfile as any).signatureAlgorithm;
    }
  }

  if (signOptions) {
    const signResult = signPolicyRegistryLockfile(lockfile, signOptions.signatureKeyId, signOptions.signerStore);
    if (!signResult.success) {
      return {
        success: false,
        lockfile,
        diagnostic: {
          success: false,
          driftDetected,
          lockfileRewritten: false,
          signatureInvalidated,
          resignAttempted: true,
          resignSuccess: false,
          signerKeyId: signOptions.signatureKeyId,
          error: signResult.error,
          message: `Refresh failed during re-signing: ${signResult.error}`
        }
      };
    }
    return {
      success: true,
      lockfile: signResult.lockfile!,
      diagnostic: {
        success: true,
        driftDetected,
        lockfileRewritten: true,
        signatureInvalidated,
        resignAttempted: true,
        resignSuccess: true,
        signerKeyId: signOptions.signatureKeyId,
        message: driftDetected ? 'Lockfile refreshed and re-signed' : 'Lockfile was already fresh, but was re-signed'
      }
    };
  }

  return {
    success: true,
    lockfile,
    diagnostic: {
      success: true,
      driftDetected,
      lockfileRewritten: driftDetected || signatureInvalidated || !existingLockfile,
      signatureInvalidated,
      resignAttempted: false,
      message: driftDetected 
        ? (signatureInvalidated ? 'Lockfile refreshed and stale signature invalidated' : 'Lockfile refreshed')
        : 'Lockfile is already fresh'
    }
  };
}
