import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
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
    applyEvaluationPolicyPatchArtifact,
    exportEvaluationPolicyPatchArtifact,
    computeEvaluationContextFingerprint,
    resolveEvaluationPolicyTargetProfile,
    buildPolicyPatchPullRequestPayload
} from '@arch-engine/core';
import { loadEvaluationPolicyFile } from './loadEvaluationPolicyFile.js';

export async function emitPolicyPrCommand(args: string[]): Promise<void> {
    let topologyPath = 'topology-export.json';
    const packDirs: string[] = [];
    let jsonFlag = false;
    let titleOnlyFlag = false;
    let commitMessageOnlyFlag = false;
    let bodyOnlyFlag = false;
    let policyPaths: string[] = [];
    let cliProfile: string | undefined = undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t' || args[i] === '--topology') {
            topologyPath = args[++i];
        } else if (args[i] === '-p' || args[i] === '--pack') {
            packDirs.push(args[++i]);
        } else if (args[i] === '--json') {
            jsonFlag = true;
        } else if (args[i] === '--title-only') {
            titleOnlyFlag = true;
        } else if (args[i] === '--commit-message-only') {
            commitMessageOnlyFlag = true;
        } else if (args[i] === '--body-only') {
            bodyOnlyFlag = true;
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

    let targetPolicyPath = 'evaluation-policy.json';
    let originalFileText = '{}';
    let originalPolicyFileFingerprint: string | null = null;
    let rawPolicy: any = { profiles: { default: {} } };

    if (policyPaths.length > 0) {
        targetPolicyPath = policyPaths[0];
        if (fs.existsSync(targetPolicyPath)) {
            originalFileText = fs.readFileSync(targetPolicyPath, 'utf-8');
            originalPolicyFileFingerprint = crypto.createHash('sha256').update(originalFileText, 'utf8').digest('hex');
        }
        
        rawPolicy = loadEvaluationPolicyFile(targetPolicyPath);
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

    const currentEvaluationContextFingerprint = computeEvaluationContextFingerprint(dataset, packs, inspection);

    const patchArtifact = generateEvaluationPolicyPatchArtifact(
        suggestionObj, 
        patchTargetProfile, 
        patchTargetSource,
        currentEvaluationContextFingerprint
    );

    const applyResult = applyEvaluationPolicyPatchArtifact(originalFileText, rawPolicy, patchArtifact);
    const exportResult = exportEvaluationPolicyPatchArtifact(patchArtifact, applyResult, { 
        policyFileFingerprint: originalPolicyFileFingerprint
    });

    const payload = buildPolicyPatchPullRequestPayload(exportResult);

    if (jsonFlag) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    if (titleOnlyFlag) {
        console.log(payload.suggestedTitle);
        return;
    }

    if (commitMessageOnlyFlag) {
        console.log(payload.suggestedCommitMessage);
        return;
    }

    if (bodyOnlyFlag) {
        console.log(payload.suggestedBodyMarkdown);
        return;
    }

    console.log(`Generated PR Payload for Profile: ${payload.targetProfile}`);
    console.log(`\n--- Title ---\n${payload.suggestedTitle}`);
    console.log(`\n--- Commit Message ---\n${payload.suggestedCommitMessage}`);
    console.log(`\n--- Body ---\n${payload.suggestedBodyMarkdown}`);
    console.log(`\n---\nPR Payload Schema: \`${payload.pullRequestPayloadSchemaVersion}\``);
}
