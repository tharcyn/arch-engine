import type { PolicyExecutionContext } from '../policy/PolicyExecutionContext.js';

export interface ProviderExecutionContext {
    readonly providerId: string;
    readonly datasetIdentityHash: string;
    readonly capabilityManifest: Readonly<Record<string, boolean>>;
    readonly providerSpecificMetadata?: Readonly<Record<string, unknown>>;
}

export interface FederatedTopologyExecutionContext extends PolicyExecutionContext {
    readonly providers: readonly ProviderExecutionContext[];
    readonly mergedTopologyDataset: any; // Using any or specific dataset type if available
    readonly federationExecutionHash: string;
    readonly capabilityIntersectionManifest: Readonly<Record<string, boolean>>;
    readonly capabilityUnionManifest: Readonly<Record<string, boolean>>;
    readonly providerIdentityMap: Readonly<Record<string, string>>;
    readonly datasetIdentitySet: readonly string[];
}
