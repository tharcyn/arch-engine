import * as fs from 'fs';
import * as path from 'path';
import { FederationEvaluationPolicyPullRequestPayload } from '@arch-engine/core';
import { buildGitlabMergeRequestPlan, executeGitlabMergeRequestPlan } from '@arch-engine/adapter-gitlab';

export async function gitlabCreatePolicyMrCommand(args: string[]): Promise<void> {
    let executeFlag = false;
    let jsonOutputPlanFlag = false;
    let fileInputPath: string | undefined = undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--execute') {
            executeFlag = true;
        } else if (args[i] === '--dry-run') {
            executeFlag = false;
        } else if (args[i] === '--json-output-plan') {
            jsonOutputPlanFlag = true;
        } else if (!args[i].startsWith('-')) {
            fileInputPath = args[i];
        }
    }

    let payloadJsonStr = '';

    if (fileInputPath) {
        if (!fs.existsSync(fileInputPath)) {
            console.error(`Payload file not found: ${fileInputPath}`);
            process.exit(1);
        }
        payloadJsonStr = fs.readFileSync(path.resolve(fileInputPath), 'utf8');
    } else {
        // Read from stdin
        try {
            payloadJsonStr = fs.readFileSync(0, 'utf-8');
        } catch (e) {
            console.error('Failed to read payload from stdin.');
            process.exit(1);
        }
    }

    if (!payloadJsonStr || payloadJsonStr.trim() === '') {
        console.error('Empty payload provided.');
        process.exit(1);
    }

    let payload: FederationEvaluationPolicyPullRequestPayload;
    try {
        payload = JSON.parse(payloadJsonStr);
    } catch (e) {
        console.error('Failed to parse payload as JSON.');
        process.exit(1);
        return;
    }

    const buildResult = buildGitlabMergeRequestPlan(payload);

    if (!buildResult.success) {
        if (jsonOutputPlanFlag) {
            console.log(JSON.stringify(buildResult, null, 2));
        } else {
            console.error(`Failed to build execution plan: ${buildResult.refusalReason}`);
        }
        process.exit(1);
        return;
    }

    if (jsonOutputPlanFlag && !executeFlag) {
        console.log(JSON.stringify(buildResult.plan, null, 2));
        return;
    }

    const execResult = await executeGitlabMergeRequestPlan(buildResult.plan, { execute: executeFlag });

    if (jsonOutputPlanFlag) {
        console.log(JSON.stringify(execResult, null, 2));
        return;
    }

    console.log(`Execution mode: ${execResult.executionMode}`);
    console.log(`Adapter outcome: ${execResult.adapterOutcome}`);
    console.log(`Runtime repository verified: ${execResult.repositoryContextVerified}`);
    console.log(`Runtime repository: ${execResult.runtimeRepository || 'unknown'}`);
    if (execResult.repositoryIdentityAdvisory) {
        console.log(`Advisory: repository identity mismatch handled as advisory in dry-run`);
    }

    console.log(`\nBranch name: ${execResult.branchName}\n`);

    if (execResult.refusalReason) {
        console.error(`Failed execution: Refusal reason: ${execResult.refusalReason}`);
        process.exit(1);
        return;
    }

    if (execResult.executionMode === 'dry-run') {
        console.log(`[DRY-RUN] Would create branch '${execResult.branchName}' and MR`);
    } else {
        console.log(`Branch created: ${execResult.branchCreated}`);
        console.log(`Branch reused: ${!!execResult.branchReused}`);
        console.log(`Commit created: ${execResult.commitCreated}`);
        console.log(`Existing MR detected: ${execResult.existingPullRequestDetected}`);
        console.log(`Merge request created: ${execResult.pullRequestCreated}`);
        
        if (execResult.existingPullRequestDetected) {
            console.log(`Existing MR number: ${execResult.existingPullRequestNumber}`);
            console.log(`Existing MR URL: ${execResult.existingPullRequestUrl}`);
        } else if (execResult.pullRequestCreated) {
            console.log(`New MR number: ${execResult.pullRequestNumber}`);
            console.log(`New MR URL: ${execResult.pullRequestUrl}`);
        }
    }
}
