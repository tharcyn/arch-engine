import type { TrustPolicyAuditDiagnostic } from './TrustPolicyAuditDiagnostic';
import type { LockfileInstallEnforcementDiagnostic } from './LockfileInstallEnforcementDiagnostic';
import type { LockfileFreshnessDiagnostic } from './LockfileFreshnessDiagnostic';

import type { LockfileMigrationAdvisory } from './adviseLockfileMigration';
import type { DatasetRuntimeCompatibilityDiagnostic } from './assessDatasetRuntimeCompatibility';
import type { PolicyPackDatasetCapabilityDiagnostic } from './assessPolicyPackDatasetCapabilityCompatibility.js';
import type { PolicyPackGovernanceCompatibilityDiagnostic } from './assessPolicyPackGovernanceSurfaceCompatibility.js';
import type { PolicyPackExecutionCompatibilityDiagnostic } from './assessPolicyPackExecutionCompatibility.js';

export type RuntimeReadinessStatus = 'ready' | 'degraded' | 'blocked' | 'invalid';

export interface LockfileRuntimeReadinessDiagnostic {
  readonly status: RuntimeReadinessStatus;
  readonly trustDoctor: TrustPolicyAuditDiagnostic;
  readonly enforcement?: LockfileInstallEnforcementDiagnostic;
  readonly freshness?: LockfileFreshnessDiagnostic;
  readonly migrationAdvisory?: LockfileMigrationAdvisory;
  readonly datasetCompatibility?: DatasetRuntimeCompatibilityDiagnostic;
  /**
   * Diagnostic indicating whether the installed policy packs are compatible 
   * with the active topology dataset's capability manifest.
   * Only populated if an active dataset's capability manifest was evaluated.
   */
  readonly policyPackCapabilityCompatibility?: PolicyPackDatasetCapabilityDiagnostic;
  /**
   * Diagnostic indicating whether the installed policy packs' governance requirements 
   * are satisfied by the active topology dataset's governance surfaces.
   * Only populated if an active dataset's governance surfaces were evaluated.
   */
  readonly policyPackGovernanceCompatibility?: PolicyPackGovernanceCompatibilityDiagnostic;
  /**
   * Diagnostic indicating whether the installed policy packs' unified execution requirements
   * are satisfied. Composes both capability and governance compatibility.
   */
  readonly policyPackExecutionCompatibility?: PolicyPackExecutionCompatibilityDiagnostic;
  readonly summaryMessage: string;
}
