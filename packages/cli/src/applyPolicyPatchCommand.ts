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
    writeEvaluationPolicyPatch,
    computeEvaluationContextFingerprint,
    resolveEvaluationPolicyTargetProfile
} from '@arch-engine/core';
import { loadEvaluationPolicyFile } from './loadEvaluationPolicyFile.js';

export async function applyPolicyPatchCommand(args: string[]): Promise<void> {
    let topologyPath = 'topology-export.json';
    const packDirs: string[] = [];
    let jsonFlag = false;
    let writeFlag = false;
    let policyPaths: string[] = [];
    let cliProfile: string | undefined = undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t' || args[i] === '--topology') {
            topologyPath = args[++i];
        } else if (args[i] === '-p' || args[i] === '--pack') {
            packDirs.push(args[++i]);
        } else if (args[i] === '--json') {
            jsonFlag = true;
        } else if (args[i] === '--apply') {
            writeFlag = true;
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
    const writeResult = writeEvaluationPolicyPatch(targetPolicyPath, applyResult, { 
        dryRun: !writeFlag,
        originalPolicyFileFingerprint,
        currentEvaluationContextFingerprint
    });

    if (jsonFlag) {
        console.log(JSON.stringify(writeResult, null, 2));
        return;
    }

    if (!writeResult.writeAttempted) {
        if (writeResult.dryRun && applyResult.applicable) {
            console.log(`\n${applyResult.summaryMessage}`);
            console.log(`Target profile: ${applyResult.targetProfile}`);
            console.log(`Target profile source: ${applyResult.targetProfileSource}`);
            console.log(`Authoritative: ${applyResult.targetProfileAuthoritative}`);
            console.log(`Changed paths: ${applyResult.changedPaths.length}`);
            
            const codeAdds = Object.keys(patchArtifact.proposedCodeOverrides || {}).length;
            const catAdds = Object.keys(patchArtifact.proposedCategoryOverrides || {}).length;
            const waiverAdds = (patchArtifact.proposedWaivers || []).length;
            
            console.log(`Code overrides added: ${codeAdds}`);
            console.log(`Category overrides added: ${catAdds}`);
            console.log(`Waivers added: ${waiverAdds}`);
            console.log('\n(Dry-run only. No file written. Run with --apply to write changes.)');
        } else {
            console.log(`\nPatch applicable: false`);
            console.log(`Refusal reason: ${writeResult.refusalReason}`);
        }
        return;
    }

    // Write attempted
    console.log(`\n${writeResult.summaryMessage}`);
    if (writeResult.writePerformed) {
        console.log(`Write completed: ${writeResult.writtenPath}`);
        if (writeResult.backupCreated) {
            console.log(`Backup created: ${writeResult.backupPath}`);
        }
        console.log(`Changed paths: ${writeResult.changedPaths.length}`);
    } else {
        console.log(`Write refused/failed: ${writeResult.refusalReason}`);
    }
}
