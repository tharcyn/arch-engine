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
    readonly bundleIntegrityHash: string;
}
