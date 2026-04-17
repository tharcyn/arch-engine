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
    aggregateFederationEvaluationSeverity,
    generateEvaluationPolicyPatchArtifact,
    computeEvaluationContextFingerprint,
    resolveEvaluationPolicyTargetProfile
} from '@arch-engine/core';
import { loadEvaluationPolicyFile } from './loadEvaluationPolicyFile.js';

export async function generatePolicyPatchCommand(args: string[]): Promise<void> {
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

    const targetResolution = resolveEvaluationPolicyTargetProfile(suggestionObj, context);
    const patchTargetProfile = targetResolution.targetProfile;
    const patchTargetSource = targetResolution.targetProfileSource;

    const patch = generateEvaluationPolicyPatchArtifact(suggestionObj, patchTargetProfile, patchTargetSource);

    if (jsonFlag) {
        console.log(JSON.stringify(patch, null, 2));
        return;
    }

    console.log(`\n${patch.summaryMessage}`);
    console.log(`Target Profile: ${patch.targetProfile}`);
    console.log(`Target Profile Source: ${patch.targetProfileSource}`);
    console.log(`Authoritative: ${patch.targetProfileAuthoritative}`);
    console.log(`Included Suggestions: ${patch.includedSuggestions.length}`);
    console.log(`Excluded Risky Suggestions: ${patch.excludedRiskySuggestions.length}`);
    console.log(`Excluded Non-Authoritative Suggestions: ${patch.excludedNonAuthoritativeSuggestions.length}`);

    if (patch.targetProfileAuthoritative) {
        console.log('\n--- Assembled Patch Sections ---');
        if (Object.keys(patch.proposedCodeOverrides).length > 0) {
            console.log('\nCode Overrides:');
            console.log(JSON.stringify(patch.proposedCodeOverrides, null, 2));
        }
        if (Object.keys(patch.proposedCategoryOverrides).length > 0) {
            console.log('\nCategory Overrides:');
            console.log(JSON.stringify(patch.proposedCategoryOverrides, null, 2));
        }
        if (patch.proposedWaivers.length > 0) {
            console.log('\nWaivers:');
            console.log(JSON.stringify(patch.proposedWaivers, null, 2));
        }
    } else {
        console.log('\n(No safe patch sections assembled because target is non-authoritative.)');
    }
}
