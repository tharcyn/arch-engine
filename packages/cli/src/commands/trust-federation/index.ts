import { GovernanceTrustFederationRuntime } from '../../../../trust-federation/src/index.js';

export async function trustFederationListCommand(options: any) {
    const result = { status: GovernanceTrustFederationRuntime.listFederation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function trustFederationInspectCommand(options: any) {
    const result = { status: GovernanceTrustFederationRuntime.inspectFederation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
