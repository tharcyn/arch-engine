import type { ExternalTopologyDataset, extractTopologySchemaVersion } from '../topology/external-topology-types.js';
import type { PolicyRegistryLockfileDatasetIdentity } from './PolicyRegistryLockfile.js';

export function extractLockfileDatasetIdentity(
    dataset: ExternalTopologyDataset
): { 
    identity: PolicyRegistryLockfileDatasetIdentity;
    capabilityManifest?: Record<string, boolean>;
    mutationClassRegistry?: Record<string, unknown>;
    authorityScopeRegistry?: Record<string, unknown>;
    surfaceConfidenceRegistry?: Record<string, unknown>;
    trustBoundaryRules?: Record<string, unknown>;
} {
    let schemaVersion: string | undefined;
    
    if (typeof dataset.topology_schema_version === 'string') {
        schemaVersion = dataset.topology_schema_version;
    } else if (dataset.topology_schema_version && typeof dataset.topology_schema_version === 'object' && typeof (dataset.topology_schema_version as any).version === 'string') {
        schemaVersion = (dataset.topology_schema_version as any).version;
    }

    // Deterministically normalize capability manifest by sorting keys
    let capabilityManifest: Record<string, boolean> | undefined = undefined;
    if (dataset.topology_capability_manifest) {
        capabilityManifest = {};
        const sortedKeys = Object.keys(dataset.topology_capability_manifest).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            capabilityManifest[key] = dataset.topology_capability_manifest[key];
        }
    }

    let mutationClassRegistry: Record<string, unknown> | undefined = undefined;
    if (dataset.mutation_class_registry) {
        mutationClassRegistry = {};
        const sortedKeys = Object.keys(dataset.mutation_class_registry).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            mutationClassRegistry[key] = dataset.mutation_class_registry[key];
        }
    }

    let authorityScopeRegistry: Record<string, unknown> | undefined = undefined;
    if (dataset.authority_scope_registry) {
        authorityScopeRegistry = {};
        const sortedKeys = Object.keys(dataset.authority_scope_registry).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            authorityScopeRegistry[key] = dataset.authority_scope_registry[key];
        }
    }

    let surfaceConfidenceRegistry: Record<string, unknown> | undefined = undefined;
    if (dataset.surface_confidence_registry) {
        surfaceConfidenceRegistry = {};
        const sortedKeys = Object.keys(dataset.surface_confidence_registry).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            surfaceConfidenceRegistry[key] = dataset.surface_confidence_registry[key];
        }
    }

    let trustBoundaryRules: Record<string, unknown> | undefined = undefined;
    if (dataset.trust_boundary_rules) {
        trustBoundaryRules = {};
        const sortedKeys = Object.keys(dataset.trust_boundary_rules).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            trustBoundaryRules[key] = dataset.trust_boundary_rules[key];
        }
    }

    return {
        identity: {
            topologyDatasetIdentity: dataset.topology_dataset_identity as Record<string, unknown>,
            datasetSemver: dataset.topology_dataset_identity?.dataset_semver,
            datasetFormatIdentifier: dataset.dataset_format_identifier,
            topologySchemaVersion: schemaVersion,
            datasetLineage: dataset.dataset_lineage as Record<string, unknown> | undefined
        },
        capabilityManifest,
        mutationClassRegistry,
        authorityScopeRegistry,
        surfaceConfidenceRegistry,
        trustBoundaryRules
    };
}
