import { ProfilerRuntime } from '../../../../core/src/profiler/index.js';

export async function costEvaluateCommand(options: any) {
    const cost = ProfilerRuntime.estimatePolicyExecutionCost();
    if (options.json) console.log(JSON.stringify(cost, null, 2));
    else console.log(JSON.stringify(cost, null, 2));
}

export async function costFederationCommand(options: any) {
    const cost = ProfilerRuntime.estimateFederationMergeComplexity();
    if (options.json) console.log(JSON.stringify(cost, null, 2));
    else console.log(JSON.stringify(cost, null, 2));
}

export async function costSimulationCommand(options: any) {
    const cost = ProfilerRuntime.estimateSimulationExecutionCost();
    if (options.json) console.log(JSON.stringify(cost, null, 2));
    else console.log(JSON.stringify(cost, null, 2));
}
