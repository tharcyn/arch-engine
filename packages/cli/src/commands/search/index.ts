import { TrustRankedSearchRuntime } from '../../../../discovery/src/search/index.js';

export async function searchGovernanceCommand(options: any) {
    const result = { status: TrustRankedSearchRuntime.searchGovernance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
