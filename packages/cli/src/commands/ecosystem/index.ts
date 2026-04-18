import { ProtocolCompatibilityBadgeRuntime } from '../../../../ecosystem-kit/src/index.js';
import { ReferenceDeploymentKitRuntime } from '../../../../ecosystem-kit/src/deployments/index.js';
import { ExampleAdapterBundleRuntime } from '../../../../ecosystem-kit/src/examples/index.js';

export async function protocolBadgesCommand(options: any) {
    const result = { status: ProtocolCompatibilityBadgeRuntime.listBadges() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolVerifyComplianceCommand(options: any) {
    const result = { status: ProtocolCompatibilityBadgeRuntime.verifyCompliance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function ecosystemInitReferenceCommand(options: any) {
    const result = { status: ReferenceDeploymentKitRuntime.initReference() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function ecosystemInitAdapterLabCommand(options: any) {
    const result = { status: ReferenceDeploymentKitRuntime.initAdapterLab() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function ecosystemGenerateExampleAdapterCommand(options: any) {
    const result = { status: ExampleAdapterBundleRuntime.generateExample() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
