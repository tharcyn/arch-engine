export type PolicyPackFindingCategory = 'trust' | 'compatibility' | 'governance' | 'execution' | 'advisory' | 'policy-pack';

export interface PolicyPackFinding {
    readonly severity: 'info' | 'warning' | 'error';
    readonly message: string;
    readonly code?: string;
    readonly surface?: string;
    readonly affectedEntity?: string;
    readonly category?: PolicyPackFindingCategory;
    readonly classification?: string;
    
    // Phase 10 Invariants
    readonly confidence?: string;
    readonly scope?: string;
    readonly authorityBoundaryCrossing?: string;
    readonly mutationClass?: string;
    readonly policyPackId?: string;
    readonly policyRuleId?: string;
    readonly evaluationMode?: string;
    
    // Federation Phase
    readonly providerProvenance?: readonly string[];
    readonly datasetProvenance?: readonly string[];

    /** @deprecated Use taxonomyRepaired instead */
    readonly _taxonomyRepaired?: boolean;
    readonly taxonomyRepaired?: boolean;
}

export interface NormalizedPolicyPackFinding extends PolicyPackFinding {
    readonly code: string;
    readonly category: PolicyPackFindingCategory;
    /**
     * Indicates whether the taxonomy normalizer modified the original finding code
     * during ingestion. True if the code was missing, malformed, contained illegal
     * characters, or collided with a reserved core prefix.
     * Safe for CI and telemetry inspection.
     */
    readonly taxonomyRepaired?: boolean;
    readonly _taxonomyRepaired?: never;
}
