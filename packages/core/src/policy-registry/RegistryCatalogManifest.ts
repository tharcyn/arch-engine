export interface CatalogPolicyPackEntry {
    readonly policyPackId: string;
    readonly availableVersions: readonly string[];
    readonly manifestHashPerVersion: Record<string, string>;
    readonly dependencyGraphHashPerVersion: Record<string, string>;
}

export interface RegistryCatalogManifest {
    readonly catalogId: string;
    readonly catalogVersion: string;
    readonly catalogGeneratedAtExcludedFromHash: string;
    readonly policyPacks: readonly CatalogPolicyPackEntry[];
    readonly catalogSignature: string | null;
    readonly catalogHash: string;
}
