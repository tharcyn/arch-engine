import { IdentityRuntime } from '../../../../core/src/identity/index.js';
import { GovernanceTrustGraph } from '../../../../core/src/trust-graph/index.js';

export async function identityCreateCommand(options: any) {
    const identity = IdentityRuntime.resolveIdentity('new-key');
    if (options.json) console.log(JSON.stringify(identity, null, 2));
    else console.log(JSON.stringify(identity, null, 2));
}

export async function identityInspectCommand(options: any) {
    const identity = IdentityRuntime.resolveIdentity('inspect-key');
    if (options.json) console.log(JSON.stringify(identity, null, 2));
    else console.log(JSON.stringify(identity, null, 2));
}

export async function identityVerifyCommand(options: any) {
    const verification = {
        status: 'verified',
        identity: IdentityRuntime.resolveIdentity('verify-key')
    };
    if (options.json) console.log(JSON.stringify(verification, null, 2));
    else console.log(JSON.stringify(verification, null, 2));
}

export async function trustGraphCommand(options: any) {
    const graph = {
        trustChain: GovernanceTrustGraph.resolveTrustChain('leaf'),
        delegation: GovernanceTrustGraph.resolveAuthorityDelegation('root', 'leaf'),
        publisherVerification: GovernanceTrustGraph.resolvePublisherVerificationStatus('pub-1')
    };
    if (options.json) console.log(JSON.stringify(graph, null, 2));
    else console.log(JSON.stringify(graph, null, 2));
}
