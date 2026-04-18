import { GovernanceObservabilityFabricRuntime } from '../../../../observability/src/index.js';
import { DriftVelocityAnalyzer } from '../../../../observability/src/drift-warning/index.js';
import { GovernanceRiskRadarRuntime } from '../../../../observability/src/risk-radar/index.js';

export async function observeTopologyCommand(options: any) {
    const result = { status: GovernanceObservabilityFabricRuntime.observeTopology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function observeDatasetsCommand(options: any) {
    const result = { status: GovernanceObservabilityFabricRuntime.observeDatasets() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function observeCapabilitiesCommand(options: any) {
    const result = { status: GovernanceObservabilityFabricRuntime.observeCapabilities() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function observeDriftRiskCommand(options: any) {
    const result = { status: DriftVelocityAnalyzer.observeDriftRisk() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function observeEcosystemRiskCommand(options: any) {
    const result = { status: GovernanceRiskRadarRuntime.observeEcosystemRisk() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
