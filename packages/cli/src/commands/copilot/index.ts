import { GovernanceCopilotRuntime, PolicyOptimizationAdvisor } from '../../../../copilot/src/index.js';
import { TopologyReasoningGraph } from '../../../../copilot/src/reasoning/index.js';

export async function copilotExplainTopologyCommand(options: any) {
    const result = { status: GovernanceCopilotRuntime.explainTopology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function copilotExplainPolicyCommand(options: any) {
    const result = { status: GovernanceCopilotRuntime.explainPolicy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function copilotExplainDriftCommand(options: any) {
    const result = { status: GovernanceCopilotRuntime.explainDrift() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function copilotReasonTopologyCommand(options: any) {
    const result = { status: TopologyReasoningGraph.reasonTopology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function copilotOptimizePolicyCommand(options: any) {
    const result = { status: PolicyOptimizationAdvisor.computePolicyOptimizationStrategy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
