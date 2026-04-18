import { GovernanceRegistryNetworkRuntime } from '../../../../registry-network/src/index.js';

export async function registryNetworkListCommand(options: any) {
    const result = { status: GovernanceRegistryNetworkRuntime.listNetwork() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function registryNetworkMirrorsCommand(options: any) {
    const result = { status: GovernanceRegistryNetworkRuntime.listMirrors() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
