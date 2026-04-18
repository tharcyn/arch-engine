import { CompatibilityTierRegistryRuntime } from '../../../../agp-foundation/src/compatibility/index.js';

export async function protocolCompatibilityTiersCommand(options: any) {
    const result = { status: CompatibilityTierRegistryRuntime.listCompatibilityTiers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
