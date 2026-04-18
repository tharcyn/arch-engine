import { ArchitectureBenchmarkingExchangeRuntime, GovernanceMaturityPercentileRuntime } from '../../../../benchmarking/src/index.js';

export async function benchmarkMaturityCommand(options: any) {
    const result = { status: ArchitectureBenchmarkingExchangeRuntime.benchmarkMaturity() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function benchmarkPercentileCommand(options: any) {
    const result = { status: GovernanceMaturityPercentileRuntime.benchmarkPercentile() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
