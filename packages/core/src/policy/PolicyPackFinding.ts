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

    // Federation provenance fields (providerProvenance, datasetProvenance)
    // were prototyped post-v1.0.0 and are used internally by the federation
    // subsystem via `(finding as any).providerProvenance = ...`. They are
    // intentionally NOT part of the v1.0.x public PolicyPackFinding shape;
    // adding them here would expand the frozen public type surface.

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
