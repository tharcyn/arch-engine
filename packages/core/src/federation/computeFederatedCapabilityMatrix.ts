import { assessPolicyPackExecutionCompatibility } from '../policy/assessPolicyPackExecutionCompatibility.js';

export interface FederatedCapabilityMatrixResult {
    readonly intersectionCapabilities: readonly string[];
    readonly unionCapabilities: readonly string[];
    readonly incompatibleCapabilities: readonly string[];
    readonly federationCompatible: boolean;
    readonly diagnostics: readonly string[];
}

export function computeFederatedCapabilityMatrix(
    datasetCapabilityIntersection: Readonly<Record<string, boolean>>,
    datasetCapabilityUnion: Readonly<Record<string, boolean>>,
    mutationClassRegistry: Readonly<Record<string, unknown>> = {},
    authorityScopeRegistry: Readonly<Record<string, unknown>> = {},
    surfaceConfidenceRegistry: Readonly<Record<string, unknown>> = {},
    trustBoundaryRules: Readonly<Record<string, unknown>> = {},
    policyPacks: ReadonlyArray<{ metadata?: Record<string, unknown> }> = []
): FederatedCapabilityMatrixResult {
    const intersectionCapabilities = Object.keys(datasetCapabilityIntersection).filter(k => datasetCapabilityIntersection[k] === true);
    const unionCapabilities = Object.keys(datasetCapabilityUnion).filter(k => datasetCapabilityUnion[k] === true);
    
    const packMetadatas = policyPacks.map(p => p.metadata).filter(Boolean) as any[];
    
    const compat = assessPolicyPackExecutionCompatibility(
        datasetCapabilityIntersection,
        mutationClassRegistry,
        authorityScopeRegistry,
        surfaceConfidenceRegistry,
        trustBoundaryRules,
        packMetadatas
    );
    
    return {
        intersectionCapabilities,
        unionCapabilities,
        incompatibleCapabilities: [], // Extracted from diagnostics if needed, but not strictly exposed by assessPolicyPackExecutionCompatibility directly in a specific array
        federationCompatible: compat.overallStatus === 'compatible',
        diagnostics: compat.violations || []
    };
}
