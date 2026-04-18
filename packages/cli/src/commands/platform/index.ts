import { GovernancePlatformInterfaceRuntime } from '../../../../platform-interface/src/index.js';
import { ConnectorCompatibilityResolver } from '../../../../platform-interface/src/connectors/index.js';
import { EnterpriseTopologyBindingRuntime } from '../../../../platform-interface/src/topology-binding/index.js';
import { DeploymentFootprintEstimator } from '../../../../platform-interface/src/footprint/index.js';

export async function platformInspectCommand(options: any) {
    const result = { status: GovernancePlatformInterfaceRuntime.inspectPlatform() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function platformConnectorsCommand(options: any) {
    const result = { status: GovernancePlatformInterfaceRuntime.listConnectors() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function platformValidateConnectorsCommand(options: any) {
    const result = { status: ConnectorCompatibilityResolver.validateConnectors() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function platformTopologyPlanCommand(options: any) {
    const result = { status: EnterpriseTopologyBindingRuntime.planTopology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function platformFootprintCommand(options: any) {
    const result = { status: DeploymentFootprintEstimator.estimateFootprint() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
