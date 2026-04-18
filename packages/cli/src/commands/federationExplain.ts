import { runFederatedEvaluationPlan } from '@arch-engine/core';
import type { FederationExplainResultJSON } from '../contracts/FederationExplainResult.schema.js';

export async function federationExplainCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: "Must specify at least one provider using --providers" }));
        } else {
            console.error('Error: Must specify at least one provider using --providers');
        }
        return 5; // 5 = provider adapter unavailable
    }

    if (!options.json) {
        console.log('\n📖 --- Federation Explanation Report --- 📖\n');
        console.log('Executing evaluation to build explanation surface...');
    }
    
    const inputs = providers.map((p: string) => ({
        providerId: p,
        datasetPath: `${p}-dataset.json`
    }));

    try {
        const result = runFederatedEvaluationPlan(
            inputs,
            [], // Policy packs
            {}, {}, {}, {}
        );

        if (options.json) {
            const explainResult: FederationExplainResultJSON = {
                providerContributionSummary: {},
                datasetContributionSummary: {},
                findingContributionSummary: {},
                mergedNodeCount: 0, // Would be extracted if exposed
                mergedEdgeCount: 0, // Would be extracted if exposed
                deduplicatedFindingCount: result.mergedFindings.length,
                findings: result.mergedFindings.map((f: any) => ({
                    code: f.code,
                    severity: f.severity,
                    message: f.message,
                    providerProvenance: f.providerProvenance || [],
                    datasetProvenance: f.datasetProvenance || []
                })),
                ruleExecutionEligibilityMatrix: {},
                capabilityConstraintsApplied: result.compatibilityDiagnostics,
                federationExecutionHash: result.federationExecutionHash,
                diagnostics: result.compatibilityDiagnostics
            };
            console.log(JSON.stringify(explainResult, null, 2));
            return result.compatibilityDiagnostics.length > 0 ? 3 : 0;
        }

        // We import and defer to the existing evaluate command with --show-provenance for human-readable format
        const { runFederatedEvaluationCommand } = await import('../runFederatedEvaluationCommand.js');
        const explainOptions = { ...options, showProvenance: true };
        const exitCode = await runFederatedEvaluationCommand(explainOptions);
        
        console.log('\n✅ Explanation Complete\n');
        return exitCode;
    } catch (e: any) {
        if (options.json) {
            console.log(JSON.stringify({ error: e.message }));
        } else {
            console.error(`\n❌ Federation Explain Failed: ${e.message}`);
        }
        
        if (e.message.includes('collision')) return 2;
        if (e.message.includes('schema')) return 6;
        return 4;
    }
}
