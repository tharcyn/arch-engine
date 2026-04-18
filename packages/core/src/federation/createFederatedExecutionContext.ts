import type { FederatedTopologyExecutionContext, ProviderExecutionContext } from './FederatedTopologyExecutionContext.js';
import type { ValidatedTopologyDataset } from '../topology/external-topology-types.js';
import type { TopologyGraph } from '../topology/TopologyGraph.js';
import { extractTopologyGraph } from '../topology/extractTopologyGraph.js';
import { projectValidatedDatasetToValidatorView } from '../topology/projectValidatedDatasetToValidatorView.js';
import { computeFederationExecutionHash } from './computeFederationExecutionHash.js';
import { diffTopologyGraphs } from '../topology/diffTopologyGraphs.js';
import { classifyTopologyDiff } from '../topology/classifyTopologyDiff.js';
import { classifyPolicyRelevantDiff } from '../topology/classifyPolicyRelevantDiff.js';
import { extractLockfileDatasetIdentity } from '../policy/extractLockfileDatasetIdentity.js';

export function createFederatedExecutionContext(
    providerDatasets: Record<string, ValidatedTopologyDataset>,
    datasetCapabilityIntersection: Readonly<Record<string, boolean>>,
    datasetCapabilityUnion: Readonly<Record<string, boolean>>,
    datasetIdentityHashes: readonly string[]
): FederatedTopologyExecutionContext {
    
    const allNodes: any[] = [];
    const allEdges: any[] = [];
    
    const providers: ProviderExecutionContext[] = [];
    const providerIdentityMap: Record<string, string> = {};
    const datasetIdentities: string[] = [];

    const sortedProviders = Object.keys(providerDatasets).sort();

    for (let i = 0; i < sortedProviders.length; i++) {
        const providerId = sortedProviders[i];
        const ds = providerDatasets[providerId];
        const view = projectValidatedDatasetToValidatorView(ds);
        const graph = extractTopologyGraph(view);
        
        allNodes.push(...graph.nodes);
        allEdges.push(...graph.edges);
        
        const extracted = extractLockfileDatasetIdentity(ds as any);
        const identityHash = datasetIdentityHashes[i];
        
        providers.push({
            providerId,
            datasetIdentityHash: identityHash,
            capabilityManifest: extracted.capabilityManifest || {}
        });
        
        providerIdentityMap[providerId] = identityHash;
        datasetIdentities.push(identityHash);
    }
    
    // De-dup nodes and edges
    const uniqueNodes = Array.from(new Map(allNodes.map(n => [n.id, n])).values());
    const uniqueEdges = Array.from(new Map(allEdges.map(e => [`${e.sourceId}->${e.targetId}`, e])).values());
    
    const mergedGraph: TopologyGraph = {
        nodes: uniqueNodes,
        edges: uniqueEdges,
        graphSurfaceHash: ''
    };
    
    const federationExecutionHash = computeFederationExecutionHash(datasetIdentities, Object.keys(datasetCapabilityIntersection));
    mergedGraph.graphSurfaceHash = federationExecutionHash; 

    // We assume self-diff for the unified topology evaluation surface
    const diff = diffTopologyGraphs(mergedGraph, mergedGraph); 
    const classification = classifyTopologyDiff(diff);
    const policyRelevantDiff = classifyPolicyRelevantDiff(diff, classification);

    return {
        providers,
        mergedTopologyDataset: mergedGraph,
        topologyGraph: mergedGraph,
        policyRelevantDiff,
        federationExecutionHash,
        capabilityIntersectionManifest: datasetCapabilityIntersection,
        capabilityUnionManifest: datasetCapabilityUnion,
        providerIdentityMap,
        datasetIdentitySet: datasetIdentities,
        capabilityManifest: datasetCapabilityIntersection, 
    };
}
