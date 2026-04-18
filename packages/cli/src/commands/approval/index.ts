import { HumanApprovalGovernanceRuntime } from '../../../../approval/src/index.js';
import { MultiPartyApprovalWorkflowRuntime } from '../../../../approval/src/workflows/index.js';
import { ApprovalQuorumResolver } from '../../../../approval/src/quorum/index.js';
import { SeparationOfDutiesRuntime } from '../../../../approval/src/separation/index.js';
import { ExceptionWaiverRuntime } from '../../../../approval/src/waivers/index.js';
import { ApprovalExpiryRuntime } from '../../../../approval/src/expiry/index.js';
import { DecisionPacketSigningRuntime } from '../../../../approval/src/signing/index.js';

export async function approvalCreateCommand(options: any) {
    const result = { status: HumanApprovalGovernanceRuntime.createApproval() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalInspectCommand(options: any) {
    const result = { status: HumanApprovalGovernanceRuntime.inspectApproval() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalWorkflowStartCommand(options: any) {
    const result = { status: MultiPartyApprovalWorkflowRuntime.startWorkflow() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalWorkflowInspectCommand(options: any) {
    const result = { status: MultiPartyApprovalWorkflowRuntime.inspectWorkflow() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalQuorumEvaluateCommand(options: any) {
    const result = { status: ApprovalQuorumResolver.evaluateQuorum() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalValidateSeparationCommand(options: any) {
    const result = { status: SeparationOfDutiesRuntime.validateSeparation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalWaiveCommand(options: any) {
    const result = { status: ExceptionWaiverRuntime.waive() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalListWaiversCommand(options: any) {
    const result = { status: ExceptionWaiverRuntime.listWaivers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalExpiryCommand(options: any) {
    const result = { status: ApprovalExpiryRuntime.checkExpiry() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalRevalidateCommand(options: any) {
    const result = { status: ApprovalExpiryRuntime.revalidate() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalSignCommand(options: any) {
    const result = { status: DecisionPacketSigningRuntime.signDecision() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function approvalVerifySignatureCommand(options: any) {
    const result = { status: DecisionPacketSigningRuntime.verifySignature() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
