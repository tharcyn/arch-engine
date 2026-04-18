import { GovernanceInteroperabilityTreatyRuntime } from '../../../../interoperability/src/index.js';
import { ProtocolCompatibilityResolver } from '../../../../interoperability/src/negotiation/index.js';

export async function treatyListCommand(options: any) {
    const result = { status: GovernanceInteroperabilityTreatyRuntime.listTreaties() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function treatyInspectCommand(options: any) {
    const result = { status: GovernanceInteroperabilityTreatyRuntime.inspectTreaty() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function treatyNegotiateCommand(options: any) {
    const result = { status: ProtocolCompatibilityResolver.negotiateTreaty() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
