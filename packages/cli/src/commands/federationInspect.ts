import { loadFederatedTopologyDatasets, computeFederatedCapabilityMatrix, createFederatedExecutionContext } from '@arch-engine/core';
import type { FederationInspectResultJSON } from '../contracts/FederationInspectResult.schema.js';

export async function federationInspectCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: "Must specify at least one provider using --providers" }));
        } else {
            console.error('Error: Must specify at least one provider using --providers');
        }
        return 5; // 5 = provider adapter unavailable (no providers specified)
    }

    const inputs = providers.map((p: string) => ({
        providerId: p,
        datasetPath: `${p}-dataset.json` // Placeholder for actual loading mechanism
    }));

    if (!options.json) {
        console.log('\n🔍 --- Federation Inspection Report --- 🔍\n');
        console.log(`Providers Detected: ${providers.join(', ')}`);
    }

    try {
        const { datasets, datasetIdentityHashes, datasetCapabilityIntersection, datasetCapabilityUnion, providerDatasetMap } = loadFederatedTopologyDatasets(inputs);
        
        if (!options.json) console.log(`Datasets Loaded: ${datasets.length}`);
        
        const matrix = computeFederatedCapabilityMatrix(datasetCapabilityIntersection, datasetCapabilityUnion);
        
        if (!options.json) {
            console.log('\n--- Capability Matrix ---');
            console.log(`Intersected (Supported by ALL): ${matrix.intersectionCapabilities.join(', ') || 'None'}`);
            console.log(`Union (Supported by ANY): ${matrix.unionCapabilities.join(', ') || 'None'}`);
            if (matrix.incompatibleCapabilities.length > 0) {
                console.log(`Incompatible Capabilities: ${matrix.incompatibleCapabilities.join(', ')}`);
            }
            console.log(`Federation Compatible: ${matrix.federationCompatible ? '✅ Yes' : '❌ No'}`);

            if (matrix.diagnostics.length > 0) {
                console.log('\nDiagnostics:');
                matrix.diagnostics.forEach(d => console.log(` - ${d}`));
            }
        }

        const federatedContext = createFederatedExecutionContext(
            providerDatasetMap,
            datasetCapabilityIntersection,
            datasetCapabilityUnion,
            datasetIdentityHashes
        );

        let multiProviderNodes = 0;
        let multiProviderEdges = 0;
        
        federatedContext.mergedTopologyDataset.nodes.forEach(node => {
            if (node.providerProvenance && node.providerProvenance.length > 1) {
                multiProviderNodes++;
            }
        });
        
        federatedContext.mergedTopologyDataset.edges.forEach(edge => {
            if (edge.providerProvenance && edge.providerProvenance.length > 1) {
                multiProviderEdges++;
            }
        });

        if (options.json) {
            const result: FederationInspectResultJSON = {
                topologyStats: {
                    mergedNodeCount: federatedContext.mergedTopologyDataset.nodes.length,
                    mergedEdgeCount: federatedContext.mergedTopologyDataset.edges.length
                },
                providerContributionMap: {}, // To be populated if needed
                datasetIdentitySet: datasetIdentityHashes,
                capabilityIntersection: matrix.intersectionCapabilities,
                capabilityUnion: matrix.unionCapabilities,
                missingCapabilities: matrix.incompatibleCapabilities,
                requiredCapabilities: [],
                providerCapabilityMap: {},
                datasetCapabilityMap: {},
                blockingProviders: [],
                blockingDatasets: [],
                identityCollisionSummary: [], // Detailed collisions can be added here
                federationExecutionHash: federatedContext.federationExecutionHash,
                diagnostics: matrix.diagnostics
            };
            console.log(JSON.stringify(result, null, 2));
            if (!matrix.federationCompatible) return 3; // 3 = capability intersection insufficient
            return 0; // 0 = success
        }

        console.log('\n--- Merged Topology Stats ---');
        console.log(`Total Merged Nodes: ${federatedContext.mergedTopologyDataset.nodes.length}`);
        console.log(`Total Merged Edges: ${federatedContext.mergedTopologyDataset.edges.length}`);
        
        console.log('\n--- Identity & Provenance Diagnostics ---');
        console.log(`Identity Overlaps Resolved (Nodes): ${multiProviderNodes}`);
        console.log(`Identity Overlaps Resolved (Edges): ${multiProviderEdges}`);
        console.log(`Federation Execution Hash: ${federatedContext.federationExecutionHash}`);
        
        console.log('\n✅ Inspection Complete\n');
        
        if (!matrix.federationCompatible) return 3;
        return 0;
    } catch (e: any) {
        if (options.json) {
            console.log(JSON.stringify({ error: e.message }));
        } else {
            console.error(`\n❌ Federation Inspection Failed: ${e.message}`);
        }
        
        // Use regex to detect error type for specific exit codes
        if (e.message.includes('collision')) return 2; // identity collision unresolved
        if (e.message.includes('schema')) return 6; // schema incompatibility detected
        return 4; // dataset ingestion failure
    }
}
