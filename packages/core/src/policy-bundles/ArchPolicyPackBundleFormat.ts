export interface ArchPolicyPackBundleFormat {
    readonly bundleFormatVersion: '1';
    readonly bundleId: string;
    readonly bundleCreatedAtExcludedFromHash: string;
    readonly bundleManifestHash: string;
    readonly bundleDependencyGraphHash: string;
    readonly bundleCapabilitySnapshotHash: string;
    readonly bundleDatasetCompatibilitySnapshotHash: string;
    readonly bundleExecutionModeSnapshotHash: string;
    readonly bundleSignature: string | null;
    readonly bundlePayload: string; // Base64 or serialized structure containing actual packs
}
