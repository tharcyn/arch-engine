import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from './PolicyRegistryLockfile';
import { auditTrustPolicyConfig } from './auditTrustPolicyConfig';
import { enforcePolicyRegistryLockfileInstall } from './enforcePolicyRegistryLockfileInstall';
import { assessPolicyRegistryLockfileFreshness } from './assessPolicyRegistryLockfileFreshness';
import { StaticLockfileTrustStore } from './LockfileTrustStore';
import type { LockfileRuntimeReadinessDiagnostic } from './LockfileRuntimeReadinessDiagnostic';
import { adviseLockfileMigration } from './adviseLockfileMigration';
import { assessDatasetRuntimeCompatibility } from './assessDatasetRuntimeCompatibility';
import { assessPolicyPackDatasetCapabilityCompatibility } from './assessPolicyPackDatasetCapabilityCompatibility';
import { assessPolicyPackGovernanceSurfaceCompatibility } from './assessPolicyPackGovernanceSurfaceCompatibility';
import { assessPolicyPackExecutionCompatibility } from './assessPolicyPackExecutionCompatibility.js';
import type { PolicyPackMetadata } from './PolicyPackMetadata';
import type { ExternalTopologyDataset } from '../topology/external-topology-types';

export function assessLockfileRuntimeReadiness(
  trustConfig: TrustPolicyConfig,
  lockfilePath: string,
  lockfile: PolicyRegistryLockfile | undefined,
  liveRegistries: PolicyRegistryLockEntry[],
  activeDatasetIdentity?: PolicyRegistryLockfile['datasetIdentity'],
  activeCapabilityManifest?: Record<string, boolean>,
  activeMutationClassRegistry?: Record<string, unknown>,
  activeAuthorityScopeRegistry?: Record<string, unknown>,
  activeSurfaceConfidenceRegistry?: Record<string, unknown>,
  activeTrustBoundaryRules?: Record<string, unknown>,
  activeDataset?: ExternalTopologyDataset,
  installedPolicyPacks?: readonly PolicyPackMetadata[]
): LockfileRuntimeReadinessDiagnostic {
  const trustDoctor = auditTrustPolicyConfig(trustConfig);

  if (trustDoctor.readiness === 'invalid') {
    return {
      status: 'invalid',
      trustDoctor,
      summaryMessage: 'Trust policy configuration is invalid. Cannot evaluate runtime readiness.'
    };
  }
  const trustStore = new StaticLockfileTrustStore(trustConfig.trustedLockfileKeys || {}, trustConfig.lockfileSigners || {});
  const enforcement = enforcePolicyRegistryLockfileInstall(
    trustConfig,
    lockfilePath,
    lockfile,
    liveRegistries,
    trustStore,
    activeDatasetIdentity,
    activeCapabilityManifest,
    activeMutationClassRegistry,
    activeAuthorityScopeRegistry,
    activeSurfaceConfidenceRegistry,
    activeTrustBoundaryRules
  );

  let freshness;
  let migrationAdvisory;
  if (lockfile) {
      freshness = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile, activeDatasetIdentity, activeCapabilityManifest, activeMutationClassRegistry, activeAuthorityScopeRegistry, activeSurfaceConfidenceRegistry, activeTrustBoundaryRules);
      migrationAdvisory = adviseLockfileMigration(lockfile, trustStore);
  }

  let datasetCompatibility;
  let policyPackCapabilityCompatibility;
  let policyPackGovernanceCompatibility;
  let policyPackExecutionCompatibility;
  if (activeDataset) {
      datasetCompatibility = assessDatasetRuntimeCompatibility(activeDataset);
      if (installedPolicyPacks) {
          policyPackExecutionCompatibility = assessPolicyPackExecutionCompatibility(
              activeCapabilityManifest,
              activeMutationClassRegistry,
              activeAuthorityScopeRegistry,
              activeSurfaceConfidenceRegistry,
              activeTrustBoundaryRules,
              installedPolicyPacks
          );

          // We also run the lower level ones to preserve the legacy diagnostic shape
          // because the unified struct delegates them but they might be used individually downstream.
          if (activeCapabilityManifest) {
              policyPackCapabilityCompatibility = assessPolicyPackDatasetCapabilityCompatibility(activeCapabilityManifest, installedPolicyPacks);
          }
          policyPackGovernanceCompatibility = assessPolicyPackGovernanceSurfaceCompatibility(
              activeMutationClassRegistry,
              activeAuthorityScopeRegistry,
              activeSurfaceConfidenceRegistry,
              activeTrustBoundaryRules,
              installedPolicyPacks
          );
      }
  }

  let status: 'ready' | 'degraded' | 'blocked' | 'invalid';
  
  if (!enforcement.allowed) {
      status = 'blocked';
  } else if (datasetCompatibility && datasetCompatibility.overallStatus === 'incompatible') {
      const mode = trustConfig.enforcementMode || 'permissive';
      if (mode === 'require-signature-and-freshness' || mode === 'require-signature') {
          status = 'blocked';
      } else {
          status = 'degraded';
      }
  } else if (policyPackExecutionCompatibility && policyPackExecutionCompatibility.overallStatus === 'incompatible') {
      const mode = trustConfig.enforcementMode || 'permissive';
      if (mode === 'require-signature-and-freshness' || mode === 'require-signature') {
          status = 'blocked';
      } else {
          status = 'degraded';
      }
  } else if (
      trustDoctor.readiness === 'degraded' || 
      (freshness && !freshness.isFresh) ||
      (datasetCompatibility && datasetCompatibility.overallStatus === 'partially-compatible') ||
      (policyPackExecutionCompatibility && policyPackExecutionCompatibility.overallStatus === 'partially-compatible') ||
      (migrationAdvisory && migrationAdvisory.recommendationStrength === 'strongly-recommended') ||
      (enforcement.verificationDiagnostic && (
          enforcement.verificationDiagnostic.isCanonical === false ||
          enforcement.verificationDiagnostic.signatureSet?.some(s => ['duplicate', 'retired', 'valid-but-non-counted'].includes(s.status))
      ))
  ) {
      status = 'degraded';
  } else {
      status = 'ready';
  }

  let summaryMessage = `Runtime is ${status.toUpperCase()}.`;
  if (status === 'blocked') {
      if (datasetCompatibility && datasetCompatibility.overallStatus === 'incompatible' && enforcement.allowed) {
          summaryMessage += ` Dataset Compatibility Blocked: ${datasetCompatibility.summaryMessage}`;
      } else if (policyPackExecutionCompatibility && policyPackExecutionCompatibility.overallStatus === 'incompatible' && enforcement.allowed) {
          summaryMessage += ` Policy-Pack Execution Blocked: ${policyPackExecutionCompatibility.summaryMessage}`;
      } else {
          summaryMessage += ` Enforcement Blocked: ${enforcement.message}`;
      }
  } else if (status === 'degraded') {
      if (trustDoctor.readiness === 'degraded') {
          summaryMessage += ` Trust policy has warnings.`;
      }
      if (freshness && !freshness.isFresh) {
          summaryMessage += ` Lockfile is stale.`;
      }
      if (datasetCompatibility && datasetCompatibility.overallStatus === 'partially-compatible') {
          summaryMessage += ` Dataset partially compatible.`;
      }
      if (policyPackExecutionCompatibility && policyPackExecutionCompatibility.overallStatus === 'partially-compatible') {
          summaryMessage += ` Policy packs partially compatible.`;
      }
      if (enforcement.verificationDiagnostic) {
          const vdiag = enforcement.verificationDiagnostic;
          if (vdiag.isCanonical === false) {
              summaryMessage += ` Signature set is non-canonical.`;
          }
          if (vdiag.signatureSet?.some(s => s.status === 'duplicate')) {
              summaryMessage += ` Signature set contains duplicates.`;
          }
          if (vdiag.signatureSet?.some(s => s.status === 'retired')) {
              summaryMessage += ` Signature set contains retired signatures.`;
          }
          if (vdiag.signatureSet?.some(s => s.status === 'valid-but-non-counted')) {
              summaryMessage += ` Signature set contains non-counted signatures.`;
          }
      }
      if (migrationAdvisory && migrationAdvisory.migrationRecommended) {
          summaryMessage += ` Migration Advisory: ${migrationAdvisory.rationale}.`;
      }
  } else if (status === 'ready') {
      summaryMessage += ` Lockfile is active and trusted.`;
      if (migrationAdvisory && migrationAdvisory.migrationRecommended) {
          summaryMessage += ` Advisory: ${migrationAdvisory.rationale}.`;
      }
  }

  return {
    status,
    trustDoctor,
    enforcement,
    freshness,
    migrationAdvisory,
    datasetCompatibility,
    policyPackCapabilityCompatibility,
    policyPackGovernanceCompatibility,
    policyPackExecutionCompatibility,
    summaryMessage
  };
}
