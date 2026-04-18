export interface FederationIdentityCollisionSummary {
    readonly collisionType: 'EXACT_DATASET_REPLAY' | 'CROSS_PROVIDER_IDENTITY_ALIAS' | 'DUPLICATE_PROVIDER_DATASET' | 'UNRESOLVABLE_IDENTITY_COLLISION';
    readonly collisionNodes: readonly string[];
    readonly collisionEdges: readonly string[];
    readonly collisionProviders: readonly string[];
    readonly resolutionOutcome: 'merged' | 'rejected' | 'deduplicated';
}

export interface FederationInspectResultJSON {
    readonly topologyStats: {
        readonly mergedNodeCount: number;
        readonly mergedEdgeCount: number;
    };
    readonly providerContributionMap: Record<string, number>;
    readonly datasetIdentitySet: readonly string[];
    readonly capabilityIntersection: readonly string[];
    readonly capabilityUnion: readonly string[];
    readonly missingCapabilities: readonly string[];
    readonly requiredCapabilities: readonly string[];
    readonly providerCapabilityMap: Record<string, readonly string[]>;
    readonly datasetCapabilityMap: Record<string, readonly string[]>;
    readonly blockingProviders: readonly string[];
    readonly blockingDatasets: readonly string[];
    readonly identityCollisionSummary: readonly FederationIdentityCollisionSummary[];
    readonly federationExecutionHash: string;
    readonly diagnostics: readonly string[];
}
