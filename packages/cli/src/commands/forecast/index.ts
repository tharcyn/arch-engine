import { TopologyStabilityForecastRuntime, CapabilityRegressionVelocityRuntime } from '../../../../observability/src/index.js';

export async function forecastTopologyStabilityCommand(options: any) {
    const result = { status: TopologyStabilityForecastRuntime.forecastTopologyStability() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function forecastCapabilityRegressionCommand(options: any) {
    const result = { status: CapabilityRegressionVelocityRuntime.forecastCapabilityRegression() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
