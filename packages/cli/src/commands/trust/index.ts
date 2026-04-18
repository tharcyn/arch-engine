import { CertificationChainResolver } from '../../../../trust-federation/src/chain-resolver/index.js';
import { DelegatedTrustPropagationRuntime, RevocationPropagationRuntime } from '../../../../trust-federation/src/delegation/index.js';

export async function trustResolveChainCommand(options: any) {
    const result = { status: CertificationChainResolver.resolveChain() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function trustRevokeCommand(options: any) {
    const result = { status: RevocationPropagationRuntime.revokeTrust() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function trustDelegateCommand(options: any) {
    const result = { status: DelegatedTrustPropagationRuntime.delegateTrust() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
