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
        
        const extracted = extractLockfileDatasetIdentity(ds as any);
        const identityHash = datasetIdentityHashes[i];

        allNodes.push(...graph.nodes.map(n => ({ node: n, providerId, datasetHash: identityHash })));
        allEdges.push(...graph.edges.map(e => ({ edge: e, providerId, datasetHash: identityHash })));
        
        providers.push({
            providerId,
            datasetIdentityHash: identityHash,
            capabilityManifest: extracted.capabilityManifest || {}
        });
        
        providerIdentityMap[providerId] = identityHash;
        datasetIdentities.push(identityHash);
    }
    
    // De-dup nodes and edges and aggregate provenance
    const nodeMap = new Map<string, any>();
    for (const { node, providerId, datasetHash } of allNodes) {
        if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, { ...node, providerProvenance: [], datasetProvenance: [] });
        }
        const existing = nodeMap.get(node.id);
        if (!existing.providerProvenance.includes(providerId)) existing.providerProvenance.push(providerId);
        if (!existing.datasetProvenance.includes(datasetHash)) existing.datasetProvenance.push(datasetHash);
    }
    const uniqueNodes = Array.from(nodeMap.values());

    const edgeMap = new Map<string, any>();
    for (const { edge, providerId, datasetHash } of allEdges) {
        const key = `${edge.sourceId}->${edge.targetId}`;
        if (!edgeMap.has(key)) {
            edgeMap.set(key, { ...edge, providerProvenance: [], datasetProvenance: [] });
        }
        const existing = edgeMap.get(key);
        if (!existing.providerProvenance.includes(providerId)) existing.providerProvenance.push(providerId);
        if (!existing.datasetProvenance.includes(datasetHash)) existing.datasetProvenance.push(datasetHash);
    }
    const uniqueEdges = Array.from(edgeMap.values());
    
    const federationExecutionHash = computeFederationExecutionHash(datasetIdentities, Object.keys(datasetCapabilityIntersection));
    
    const mergedGraph: TopologyGraph = {
        nodes: uniqueNodes,
        edges: uniqueEdges,
        graphSurfaceVersion: '1.0.0',
        graphSurfaceHash: federationExecutionHash
    }; 

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
