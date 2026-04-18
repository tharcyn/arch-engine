import { loadFederatedTopologyDatasets } from './loadFederatedTopologyDatasets.js';
import type { ProviderDatasetInput } from './loadFederatedTopologyDatasets.js';
import { computeFederatedCapabilityMatrix } from './computeFederatedCapabilityMatrix.js';
import { createFederatedExecutionContext } from './createFederatedExecutionContext.js';
import { mergeFederatedFindings } from './mergeFederatedFindings.js';
import { PolicyPackRunner } from '../topology/PolicyPackRunner.js';
import type { TopologyPolicyPack } from '../topology/TopologyPolicyPack.js';
import type { FederatedTopologyExecutionContext } from './FederatedTopologyExecutionContext.js';
import type { NormalizedPolicyPackFinding } from '../policy/PolicyPackFinding.js';

export interface FederatedEvaluationResult {
    readonly providers: readonly string[];
    readonly executionContexts: readonly FederatedTopologyExecutionContext[];
    readonly mergedFindings: readonly NormalizedPolicyPackFinding[];
    readonly federationExecutionHash: string;
    readonly compatibilityDiagnostics: readonly string[];
}

export function runFederatedEvaluationPlan(
    inputs: readonly ProviderDatasetInput[],
    policyPacks: readonly TopologyPolicyPack[],
    mutationClassRegistry: Readonly<Record<string, unknown>> = {},
    authorityScopeRegistry: Readonly<Record<string, unknown>> = {},
    surfaceConfidenceRegistry: Readonly<Record<string, unknown>> = {},
    trustBoundaryRules: Readonly<Record<string, unknown>> = {}
): FederatedEvaluationResult {
    
    const envelope = loadFederatedTopologyDatasets(inputs);
    
    const matrix = computeFederatedCapabilityMatrix(
        envelope.datasetCapabilityIntersection,
        envelope.datasetCapabilityUnion,
        mutationClassRegistry,
        authorityScopeRegistry,
        surfaceConfidenceRegistry,
        trustBoundaryRules,
        policyPacks as any[]
    );
    
    if (!matrix.federationCompatible) {
        throw new Error(`Federation capability compatibility verification failed: ${matrix.diagnostics.join(', ')}`);
    }
    
    const federatedContext = createFederatedExecutionContext(
        envelope.providerDatasetMap,
        envelope.datasetCapabilityIntersection,
        envelope.datasetCapabilityUnion,
        envelope.datasetIdentityHashes
    );
    
    const runner = new PolicyPackRunner(policyPacks);
    const results = runner.run(federatedContext);
    
    const allFindings = results.map(r => r.diagnostics as readonly NormalizedPolicyPackFinding[]);
    const merged = mergeFederatedFindings(allFindings);
    
    return {
        providers: inputs.map(i => i.providerId),
        executionContexts: [federatedContext],
        mergedFindings: merged.findings,
        federationExecutionHash: federatedContext.federationExecutionHash,
        compatibilityDiagnostics: matrix.diagnostics
    };
}
