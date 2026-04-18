import { GovernanceWorkflowRuntime, WorkflowTriggerResolver, simulateWorkflowExecution } from '../../../../workflows/src/index.js';
import { WorkflowDAGCompiler } from '../../../../workflows/src/dag/index.js';

export async function workflowStartCommand(options: any) {
    const result = { status: GovernanceWorkflowRuntime.startWorkflow() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function workflowListCommand(options: any) {
    const result = { status: GovernanceWorkflowRuntime.listWorkflows() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function workflowInspectCommand(options: any) {
    const result = { status: GovernanceWorkflowRuntime.inspectWorkflow() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function workflowPlanCommand(options: any) {
    const result = { status: WorkflowDAGCompiler.planWorkflow() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function workflowTriggerListCommand(options: any) {
    const result = { status: WorkflowTriggerResolver.listTriggers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function simulateWorkflowCommand(options: any) {
    const result = { status: simulateWorkflowExecution() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
