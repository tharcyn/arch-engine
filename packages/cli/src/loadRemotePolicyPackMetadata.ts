import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolicyPackMetadata, PolicyRegistryLockEntry } from '@arch-engine/core';
import { validatePolicyPackManifest, validatePolicyPackCompatibility } from '@arch-engine/core';

export interface LoadRemotePolicyMetadataResult {
  readonly metadata: PolicyPackMetadata[];
  readonly lockEntries: PolicyRegistryLockEntry[];
}

// Loads policy-pack metadata from configured remote registries
// enabling organization-level governance discovery
// without executing remote policy logic.
// Enables trusted remote policy-pack execution
// without npm installation when workspace trust policy permits.
// Remote registry metadata cached locally
// to ensure deterministic policy federation
// and offline-safe execution support
export async function loadRemotePolicyPackMetadata(options?: { 
  useLockfile?: boolean, 
  verifyLockfileSignature?: boolean, 
  json?: boolean,
  activeDataset?: import('@arch-engine/core').ExternalTopologyDataset 
}): Promise<LoadRemotePolicyMetadataResult> {
  const registryFile = path.resolve(process.cwd(), '.arch-engine/registry.json');
  if (!fs.existsSync(registryFile) && !options?.useLockfile) {
    return { metadata: [], lockEntries: [] };
  }

  let registries: string[] = [];
  try {
    const content = fs.readFileSync(registryFile, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed.registries && Array.isArray(parsed.registries)) {
      registries = parsed.registries.filter((r: any) => typeof r === 'string');
    }
  } catch {
    // ignore
  }

  const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
  const trustConfig = loadTrustPolicyConfig();

  let fetchFailed = false;
  let rawPacksMap: Record<string, any[]> = {};
  
  const mode = trustConfig.enforcementMode || 'permissive';
  const requiresFreshness = mode === 'require-signature-and-freshness';
  const shouldFetchLive = !options?.useLockfile || requiresFreshness;
  
  let livePacksMap: Record<string, any[]> = {};
  
  if (shouldFetchLive) {
      for (const registryUrl of registries) {
        if (trustConfig.trustedRegistries && !trustConfig.trustedRegistries.includes(registryUrl)) {
          continue;
        }
        try {
          const response = await fetch(registryUrl);
          if (!response.ok) {
            fetchFailed = true;
            continue;
          }
          
          const packs = await response.json();
          if (Array.isArray(packs)) {
              livePacksMap[registryUrl] = packs;
          } else {
              fetchFailed = true;
          }
        } catch {
          fetchFailed = true;
        }
      }
      if (fetchFailed) {
          const { readRegistryCache } = await import('./readRegistryCache.js');
          const cached = readRegistryCache();
          if (cached) {
              livePacksMap = cached;
          } else {
              livePacksMap = {}; 
          }
      }
  }

  // Parse live packs to build live lock entries for freshness evaluation
  let liveLockEntries: PolicyRegistryLockEntry[] = [];
  if (requiresFreshness) {
      const tempLockEntriesMap: Record<string, PolicyPackMetadata[]> = {};
      for (const url of Object.keys(livePacksMap)) {
          tempLockEntriesMap[url] = [];
          for (const parsed of livePacksMap[url]) {
              if (validatePolicyPackManifest(parsed) && validatePolicyPackCompatibility(parsed).compatible) {
                  const m: any = { policyPackId: parsed.policyPackId, description: parsed.description, category: parsed.category };
                  if (parsed.engineCompatibility) m.engineCompatibility = parsed.engineCompatibility;
                  if (parsed.dependencies) m.dependencies = parsed.dependencies;
                  if (parsed.packageName) m.packageName = parsed.packageName;
                  if (parsed.signature) m.signature = parsed.signature;
                  if (parsed.rules && trustConfig.allowRemoteExecution) m.rules = parsed.rules;
                  m.isRemote = true;
                  tempLockEntriesMap[url].push(m);
              }
          }
      }
      liveLockEntries = Object.keys(tempLockEntriesMap).map(url => ({ registryUrl: url, packs: tempLockEntriesMap[url] }));
  }

  if (options?.useLockfile) {
      const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
      const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false, json: options?.json });
      
      const { enforcePolicyRegistryLockfileInstall, StaticLockfileTrustStore } = await import('@arch-engine/core');
      const trustStore = new StaticLockfileTrustStore(trustConfig.trustedLockfileKeys || {}, trustConfig.lockfileSigners || {});
      const lockfilePath = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
      
      const enforcementDiagnostic = enforcePolicyRegistryLockfileInstall(
          trustConfig,
          lockfilePath,
          lockfile,
          liveLockEntries,
          trustStore,
          undefined, // activeDatasetIdentity
          undefined, // activeCapabilityManifest
          undefined, // activeMutationClassRegistry
          undefined, // activeAuthorityScopeRegistry
          undefined, // activeSurfaceConfidenceRegistry
          undefined, // activeTrustBoundaryRules
          options?.activeDataset
      );

      if (!enforcementDiagnostic.allowed) {
          if (options?.json) {
              console.log(JSON.stringify(enforcementDiagnostic, null, 2));
          } else {
              console.log(`Lockfile Enforcement Blocked: ${enforcementDiagnostic.message}`);
          }
          process.exit(1);
      }

      if (lockfile) {
          for (const entry of lockfile.registries) {
              rawPacksMap[entry.registryUrl] = [...entry.packs];
          }
      }
  } else {
      rawPacksMap = livePacksMap;
  }


  const metadataArray: PolicyPackMetadata[] = [];
  const validCacheMap: Record<string, any[]> = {};
  const lockEntriesMap: Record<string, PolicyPackMetadata[]> = {};

  for (const registryUrl of Object.keys(rawPacksMap)) {
      if (trustConfig.trustedRegistries && !trustConfig.trustedRegistries.includes(registryUrl)) {
          continue;
      }

      validCacheMap[registryUrl] = [];
      lockEntriesMap[registryUrl] = [];

      for (const parsed of rawPacksMap[registryUrl]) {
        if (validatePolicyPackManifest(parsed)) {
          if (!validatePolicyPackCompatibility(parsed).compatible) {
            continue;
          }

          if (!fetchFailed && !options?.useLockfile) {
              validCacheMap[registryUrl].push(parsed);
          }
          
          const metadata: any = {
            policyPackId: parsed.policyPackId,
            description: parsed.description,
            category: parsed.category,
          };
          if (parsed.engineCompatibility) {
            metadata.engineCompatibility = parsed.engineCompatibility;
          }
          if (parsed.dependencies) {
            metadata.dependencies = parsed.dependencies;
          }
          if (parsed.packageName) {
            metadata.packageName = parsed.packageName;
          }
          if (parsed.signature) {
            metadata.signature = parsed.signature;
          }
          if (parsed.requiredDatasetCapabilities) {
            metadata.requiredDatasetCapabilities = parsed.requiredDatasetCapabilities;
          }
          if (parsed.optionalDatasetCapabilities && Array.isArray(parsed.optionalDatasetCapabilities)) {
            metadata.optionalDatasetCapabilities = parsed.optionalDatasetCapabilities.filter((item: any) => typeof item === 'string');
          }
          if (parsed.requiredMutationClasses && Array.isArray(parsed.requiredMutationClasses)) {
            metadata.requiredMutationClasses = parsed.requiredMutationClasses.filter((item: any) => typeof item === 'string');
          }
          if (parsed.requiredAuthorityScopes && Array.isArray(parsed.requiredAuthorityScopes)) {
            metadata.requiredAuthorityScopes = parsed.requiredAuthorityScopes.filter((item: any) => typeof item === 'string');
          }
          if (parsed.requiredSurfaceConfidenceKeys && Array.isArray(parsed.requiredSurfaceConfidenceKeys)) {
            metadata.requiredSurfaceConfidenceKeys = parsed.requiredSurfaceConfidenceKeys.filter((item: any) => typeof item === 'string');
          }
          if (parsed.requiredTrustBoundaryRules && Array.isArray(parsed.requiredTrustBoundaryRules)) {
            metadata.requiredTrustBoundaryRules = parsed.requiredTrustBoundaryRules.filter((item: any) => typeof item === 'string');
          }

          let keepRules = false;
          if (trustConfig.allowRemoteExecution === true) {
            let eligible = true;
            if (trustConfig.requireSignatures === true) {
              eligible = false;
            }
            if (trustConfig.allowedNamespaces && parsed.packageName) {
              if (!trustConfig.allowedNamespaces.some((ns: string) => parsed.packageName!.startsWith(ns))) {
                eligible = false;
              }
            } else if (trustConfig.allowedNamespaces && !parsed.packageName) {
              eligible = false;
            }
            if (eligible) {
              keepRules = true;
            }
          }

          if (keepRules && parsed.rules) {
            metadata.rules = parsed.rules;
          }
          metadata.isRemote = true;

          metadataArray.push(metadata);
          lockEntriesMap[registryUrl].push(metadata);
        }
      }
  }

  if (!fetchFailed && !options?.useLockfile && Object.keys(validCacheMap).length > 0) {
      const { writeRegistryCache } = await import('./writeRegistryCache.js');
      writeRegistryCache(validCacheMap);
  }
  
  const lockEntries: PolicyRegistryLockEntry[] = Object.keys(lockEntriesMap).map(url => ({
      registryUrl: url,
      packs: lockEntriesMap[url]
  }));

  return { metadata: metadataArray, lockEntries };
}
