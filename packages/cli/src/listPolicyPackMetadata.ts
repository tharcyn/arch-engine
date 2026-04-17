import type { PolicyPackMetadata } from '@arch-engine/core';
import { loadLocalPolicyPackMetadata } from './loadLocalPolicyPackMetadata.js';
import { loadExternalPolicyPackMetadata } from './loadExternalPolicyPackMetadata.js';
import { loadRemotePolicyPackMetadata } from './loadRemotePolicyPackMetadata.js';

// --refresh-lockfile forces a fresh remote registry resolution
// before rewriting policy-lock.json, enabling deterministic
// governance lockfile maintenance workflows
export async function listPolicyPackMetadata(options?: { useLockfile?: boolean, writeLockfile?: boolean, refreshLockfile?: boolean, diffLockfile?: boolean, verifyLockfileSignature?: boolean, json?: boolean, activeDatasetIdentity?: import('@arch-engine/core').PolicyRegistryLockfileDatasetIdentity, activeCapabilityManifest?: Record<string, boolean>, activeMutationClassRegistry?: Record<string, unknown>, activeAuthorityScopeRegistry?: Record<string, unknown>, activeSurfaceConfidenceRegistry?: Record<string, unknown>, activeTrustBoundaryRules?: Record<string, unknown>, activeDataset?: import('@arch-engine/core').ExternalTopologyDataset }): Promise<PolicyPackMetadata[]> {
  const builtin: PolicyPackMetadata[] = [
    {
      policyPackId: 'authority-boundaries',
      description: 'Detects invalid authority boundary crossings across service layers',
      category: 'topology-governance'
    },
    {
      policyPackId: 'rest-contract',
      description: 'Enforces RESTful contract invariants and API versioning',
      category: 'contract-governance'
    },
    {
      policyPackId: 'journey-regression',
      description: 'Detects regressions in critical user journeys',
      category: 'regression-governance'
    },
    {
      policyPackId: 'naming-grammar',
      description: 'Enforces standard naming conventions and grammar rules',
      category: 'quality-governance'
    },
    {
      policyPackId: 'deployment-cascade',
      description: 'Validates deployment dependency ordering and safety',
      category: 'deployment-governance'
    }
  ];

  const local = loadLocalPolicyPackMetadata();
  const external = loadExternalPolicyPackMetadata();
  
  // diffLockfile implies we don't use the lockfile for reading
  const useLockfileForReading = (options?.refreshLockfile || options?.diffLockfile) ? false : options?.useLockfile;
  
  const remoteResult = await loadRemotePolicyPackMetadata({ 
    useLockfile: useLockfileForReading, 
    verifyLockfileSignature: options?.verifyLockfileSignature,
    json: options?.json,
    activeDataset: options?.activeDataset
  });
  
  if (options?.diffLockfile) {
    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    const { diffPolicyRegistryLockfile } = await import('@arch-engine/core');
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: options?.verifyLockfileSignature, json: options?.json });
    
    if (!lockfile) {
      if (options?.json) {
        console.log(JSON.stringify({
          success: false,
          evaluatedOperation: 'verify',
          canonicalPayloadSurface: 'none',
          failureReason: 'MISSING_SIGNATURE',
          message: 'Policy lockfile not found'
        }, null, 2));
      } else {
        console.log('Policy lockfile not found');
      }
      process.exit(1);
    }
    
    const diff = diffPolicyRegistryLockfile(remoteResult.lockEntries, lockfile.registries);
    
    console.log('Policy Lockfile Diff\n');
    console.log('Added Packs:');
    if (diff.addedPacks.length === 0) {
      console.log('(none)');
    } else {
      for (const pack of diff.addedPacks) {
        console.log(`- ${pack}`);
      }
    }
    
    console.log('\nRemoved Packs:');
    if (diff.removedPacks.length === 0) {
      console.log('(none)');
    } else {
      for (const pack of diff.removedPacks) {
        console.log(`- ${pack}`);
      }
    }
    
    console.log('\nChanged Packs:');
    if (diff.changedPacks.length === 0) {
      console.log('(none)');
    } else {
      for (const pack of diff.changedPacks) {
        console.log(`- ${pack}`);
      }
    }
    
    process.exit(0);
  }
  
  if (options?.writeLockfile || options?.refreshLockfile) {
    const { writePolicyRegistryLockfile } = await import('./writePolicyRegistryLockfile.js');
    writePolicyRegistryLockfile(remoteResult.lockEntries, options?.activeDatasetIdentity, options?.activeCapabilityManifest, options?.activeMutationClassRegistry, options?.activeAuthorityScopeRegistry, options?.activeSurfaceConfidenceRegistry, options?.activeTrustBoundaryRules);
  }

  return [...builtin, ...local, ...external, ...remoteResult.metadata];
}
