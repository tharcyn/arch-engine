import { loadFederatedTopologyDatasets, computeFederatedCapabilityMatrix, createFederatedExecutionContext } from '@arch-engine/core';

export async function federationInspectCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        console.error('Error: Must specify at least one provider using --providers');
        return 1;
    }

    const inputs = providers.map((p: string) => ({
        providerId: p,
        datasetPath: `${p}-dataset.json` // Placeholder for actual loading mechanism
    }));

    console.log('\n🔍 --- Federation Inspection Report --- 🔍\n');
    console.log(`Providers Detected: ${providers.join(', ')}`);

    try {
        const { datasets, datasetIdentityHashes, datasetCapabilityIntersection, datasetCapabilityUnion, providerDatasetMap } = loadFederatedTopologyDatasets(inputs);
        
        console.log(`Datasets Loaded: ${datasets.length}`);
        
        const matrix = computeFederatedCapabilityMatrix(datasetCapabilityIntersection, datasetCapabilityUnion);
        
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

        const federatedContext = createFederatedExecutionContext(
            providerDatasetMap,
            datasetCapabilityIntersection,
            datasetCapabilityUnion,
            datasetIdentityHashes
        );

        console.log('\n--- Merged Topology Stats ---');
        console.log(`Total Merged Nodes: ${federatedContext.mergedTopologyDataset.nodes.length}`);
        console.log(`Total Merged Edges: ${federatedContext.mergedTopologyDataset.edges.length}`);
        
        console.log('\n--- Identity & Provenance Diagnostics ---');
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

        console.log(`Identity Overlaps Resolved (Nodes): ${multiProviderNodes}`);
        console.log(`Identity Overlaps Resolved (Edges): ${multiProviderEdges}`);
        console.log(`Federation Execution Hash: ${federatedContext.federationExecutionHash}`);
        
        console.log('\n✅ Inspection Complete\n');
        return 0;
    } catch (e: any) {
        console.error(`\n❌ Federation Inspection Failed: ${e.message}`);
        return 1;
    }
}
