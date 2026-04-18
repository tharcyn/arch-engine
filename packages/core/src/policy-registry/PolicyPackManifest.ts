export interface PolicyPackDependency {
    readonly policyPackId: string;
    readonly semverRange: string;
}

export interface RegistryPolicyPackManifest {
    readonly policyPackId: string;
    readonly policyPackVersion: string;
    readonly supportedCapabilities: readonly string[];
    readonly requiredCapabilities: readonly string[];
    readonly supportedDatasetSchemas: readonly string[];
    readonly supportedExecutionModes: readonly ('single-provider' | 'multi-provider-federated')[];
    readonly dependencies?: readonly PolicyPackDependency[];
    readonly optionalDependencies?: readonly PolicyPackDependency[];
    readonly conflicts?: readonly string[];
}
