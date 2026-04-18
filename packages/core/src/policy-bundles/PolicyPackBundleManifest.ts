import type { RegistryPolicyPackManifest } from '../policy-registry/PolicyPackManifest.js';

export interface PolicyPackBundleManifest {
    readonly bundleId: string;
    readonly bundleVersion: string;
    readonly includedPolicyPacks: readonly RegistryPolicyPackManifest[];
    readonly dependencyClosure: readonly string[];
    readonly capabilityCompatibilitySnapshot: readonly string[];
    readonly datasetCompatibilitySnapshot: readonly string[];
    readonly executionModeCompatibilitySnapshot: string;
    readonly federationCompatibilitySnapshot: readonly string[];
    readonly lockfileReferenceHash: string | null;
    
    // Provenance Lineage Metadata
    readonly builderIdentity: string;
    readonly builderVersion: string;
    readonly capabilityIntersectionHash: string;
    readonly datasetCompatibilityHash: string;
    readonly dependencyClosureHash: string;
    readonly executionModeCompatibilityHash: string;
    readonly federationExecutionHash: string;
    readonly sourceCatalogSetHash: string;
    readonly sourceRegistrySetHash: string;

    readonly bundleIntegrityHash: string;
}
