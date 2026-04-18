import { TransparencyExplorerRuntime } from '../../../../transparency-explorer/src/index.js';

export async function transparencyExploreBundleCommand(options: any) {
    const result = { status: TransparencyExplorerRuntime.exploreBundle() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function transparencyExplorePolicyCommand(options: any) {
    const result = { status: TransparencyExplorerRuntime.explorePolicy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function transparencyExploreCampaignCommand(options: any) {
    const result = { status: TransparencyExplorerRuntime.exploreCampaign() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
