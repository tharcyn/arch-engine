import type { PolicyRelevantDiff } from '../topology/PolicyRelevantDiff';
import type { TopologyGraph } from '../topology/TopologyGraph';

// PolicyExecutionContext defines the canonical execution surface
// used by all governance packs (built-in and workspace-defined)
// ensuring stable evaluation inputs across registry and plugin layers
export interface PolicyExecutionContext {
  readonly policyRelevantDiff: PolicyRelevantDiff;
  readonly topologyGraph: TopologyGraph;
  
  // Phase 9F/10B Extended Fields for Capability Verification
  readonly capabilityManifest?: Record<string, boolean>;
  readonly mutationClassRegistry?: Record<string, unknown>;
  readonly authorityScopeRegistry?: Record<string, unknown>;
  readonly surfaceConfidenceRegistry?: Record<string, unknown>;
  readonly trustBoundaryRules?: Record<string, unknown>;
  readonly engineRuntimeMetadata?: Record<string, unknown>;
  readonly policyPackMetadata?: Record<string, unknown>;
  readonly executionPlanMetadata?: Record<string, unknown>;
}
