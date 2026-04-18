export interface FederationDoctorResultJSON {
    readonly ingestionRouterStatus: 'active' | 'inactive';
    readonly capabilityMatrixStatus: 'deterministic' | 'nondeterministic';
    readonly identityResolutionStatus: 'contract-stable' | 'unstable';
    readonly provenanceMergeStatus: 'provenance-aware' | 'unaware';
    readonly federationCompatibilityStatus: 'ready' | 'not-ready';
    readonly diagnostics: readonly string[];
}
