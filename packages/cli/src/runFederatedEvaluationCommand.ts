import { runFederatedEvaluationPlan, FederatedEvaluationResult } from '@arch-engine/core';

export async function runFederatedEvaluationCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        console.error('Error: Must specify at least one provider using --providers');
        return 1;
    }

    // In a real CLI, we would map these to actual topology dataset paths dynamically from the environment
    // For the sake of the command, we'll map provider "github" to "github-dataset.json" if it exists or mock it
    const inputs = providers.map((p: string) => ({
        providerId: p,
        datasetPath: `${p}-dataset.json` // This is a placeholder convention for the CLI
    }));

    try {
        console.log(`Starting federated evaluation across providers: ${providers.join(', ')}`);
        
        const result = runFederatedEvaluationPlan(
            inputs,
            [], // Policy packs would be resolved here in a real implementation
            {}, {}, {}, {}
        );
        
        console.log(`Federation Execution Hash: ${result.federationExecutionHash}`);
        console.log(`Merged Findings Count: ${result.mergedFindings.length}`);
        
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        
        return result.mergedFindings.length > 0 ? 1 : 0;
    } catch (e: any) {
        console.error(`Federation Evaluation Failed: ${e.message}`);
        return 1;
    }
}
