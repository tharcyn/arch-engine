import type { ExternalTopologyDataset } from '../topology/external-topology-types.js';
import type { PolicyRegistryLockfileDatasetIdentity } from './PolicyRegistryLockfile.js';

export interface PolicyPackExecutionContext {
    readonly datasetSnapshot: ExternalTopologyDataset;
    readonly topologyDatasetIdentity: PolicyRegistryLockfileDatasetIdentity;
    readonly capabilityManifest: Record<string, boolean>;
    readonly mutationClassRegistry: Record<string, unknown>;
    readonly authorityScopeRegistry: Record<string, unknown>;
    readonly surfaceConfidenceRegistry: Record<string, unknown>;
    readonly trustBoundaryRules: Record<string, unknown>;
    readonly engineRuntimeMetadata?: Record<string, unknown>;
    readonly policyPackMetadata?: Record<string, unknown>;
    readonly executionPlanMetadata?: Record<string, unknown>;
}
