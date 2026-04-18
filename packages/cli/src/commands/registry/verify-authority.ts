export async function registryVerifyAuthorityCommand(options: any) {
    const verification = {
        registryAuthorityIdentity: 'reg-auth-1',
        registryTrustAnchorChain: ['anchor-1', 'root-anchor'],
        registryVerificationStatus: 'verified'
    };
    if (options.json) console.log(JSON.stringify(verification, null, 2));
    else console.log(JSON.stringify(verification, null, 2));
}
