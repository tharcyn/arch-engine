import * as fs from 'fs';
import * as path from 'path';
import {
    loadTopologyDataset,
    loadPolicyPack,
    assessFederationExecutionPreflight,
    materializeFederationExecutionPlan,
    runFederationEvaluationPlan,
    inspectFederationEvaluationFindings,
    suggestEvaluationPolicyAdjustments,
    resolveEvaluationPolicyProfile,
    assessFederationEvaluationPolicyGate,
    aggregateFederationEvaluationSeverity
} from '@arch-engine/core';
import { loadEvaluationPolicyFile } from './loadEvaluationPolicyFile.js';

export async function suggestPolicyCommand(args: string[]): Promise<void> {
    let topologyPath = 'topology-export.json';
    const packDirs: string[] = [];
    let jsonFlag = false;
    let policyPaths: string[] = [];
    let cliProfile: string | undefined = undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t' || args[i] === '--topology') {
            topologyPath = args[++i];
        } else if (args[i] === '-p' || args[i] === '--pack') {
            packDirs.push(args[++i]);
        } else if (args[i] === '--json') {
            jsonFlag = true;
        } else if (args[i] === '--policy') {
            policyPaths.push(args[++i]);
        } else if (args[i].startsWith('--policy=')) {
            policyPaths.push(args[i].slice('--policy='.length));
        } else if (args[i] === '--policy-profile') {
            cliProfile = args[++i];
        }
    }

    if (!fs.existsSync(topologyPath)) {
        console.error(`Topology file not found: ${topologyPath}`);
        process.exit(1);
    }
    
    const rawTopology = fs.readFileSync(path.resolve(topologyPath), 'utf-8');
    const dataset = loadTopologyDataset(rawTopology);

    const packs = packDirs.map(dir => {
        const manifestPath = path.resolve(dir, 'policy-pack.json');
        const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
        return loadPolicyPack(rawManifest);
    });

    const preflight = assessFederationExecutionPreflight(dataset, packs);
    if (!preflight.preflightAccepted) {
        console.error('Preflight rejected.');
        process.exit(1);
    }

    const plan = materializeFederationExecutionPlan(preflight);
    const result = runFederationEvaluationPlan(plan);

    const inspection = inspectFederationEvaluationFindings(result);

    let decision = undefined;
    let cliSelectedProfile = cliProfile;
    let policyFileDefaultProfile = undefined;
    let resolvedEffectiveProfile = undefined;

    if (policyPaths.length > 0) {
        const rawPolicy = loadEvaluationPolicyFile(policyPaths[0]);
        policyFileDefaultProfile = rawPolicy.defaultProfile;
        
        let activeProfileName = cliSelectedProfile || policyFileDefaultProfile || (rawPolicy.profiles ? Object.keys(rawPolicy.profiles)[0] : 'default');
        resolvedEffectiveProfile = activeProfileName;
        
        let activePolicy = resolveEvaluationPolicyProfile(rawPolicy, activeProfileName);
        for (let i = 1; i < policyPaths.length; i++) {
            activePolicy = resolveEvaluationPolicyProfile(loadEvaluationPolicyFile(policyPaths[i]), activePolicy);
        }
        const summary = aggregateFederationEvaluationSeverity(result);
        decision = assessFederationEvaluationPolicyGate(result, summary, activePolicy);
    }

    const context = {
        cliSelectedProfile,
        policyFileDefaultProfile,
        resolvedEffectiveProfile
    };

    const suggestionObj = suggestEvaluationPolicyAdjustments(inspection, decision, context);

    if (jsonFlag) {
        console.log(JSON.stringify(suggestionObj, null, 2));
        return;
    }

    console.log(`\n${suggestionObj.summaryMessage}`);

    if (suggestionObj.suggestions.length > 0) {
        console.log('\n--- Policy Suggestions ---');
        for (const sug of suggestionObj.suggestions) {
            console.log(`\nSuggested [${sug.suggestionType}]: ${sug.suggestedAction} for '${sug.target}'`);
            console.log(`  Rationale: ${sug.rationale}`);
            if (sug.isRisky) {
                console.log(`  WARNING: This is a risky adjustment. Evaluate carefully.`);
            }
            if (sug.snippetJson) {
                console.log(`  Path hint: ${sug.snippetPathHint}`);
                console.log(`  Profile target source: ${sug.profileTargetSource}`);
                console.log(`  Snippet JSON:\n${JSON.stringify(sug.snippetJson, null, 2)}`);
            }
        }
    }
}
