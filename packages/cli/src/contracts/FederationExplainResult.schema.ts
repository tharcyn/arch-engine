export interface FederationExplainResultJSON {
    readonly providerContributionSummary: Record<string, { nodes: number; edges: number; findings: number }>;
    readonly datasetContributionSummary: Record<string, { nodes: number; edges: number; findings: number }>;
    readonly findingContributionSummary: Record<string, number>;
    readonly mergedNodeCount: number;
    readonly mergedEdgeCount: number;
    readonly deduplicatedFindingCount: number;
    
    readonly findings: ReadonlyArray<{
        readonly code: string;
        readonly severity: string;
        readonly message: string;
        readonly providerProvenance: readonly string[];
        readonly datasetProvenance: readonly string[];
    }>;
    
    readonly ruleExecutionEligibilityMatrix: Record<string, 'eligible' | 'ineligible'>;
    readonly capabilityConstraintsApplied: readonly string[];
    
    readonly federationExecutionHash: string;
    readonly diagnostics: readonly string[];
}
