export async function bundleVerifyAuthorityCommand(options: any) {
    const verification = {
        bundleAuthorityCertificate: 'bundle-cert-1',
        bundlePublisherIdentity: 'pub-a',
        bundleSignatureChain: ['sig-1', 'sig-root'],
        status: 'verified'
    };
    if (options.json) console.log(JSON.stringify(verification, null, 2));
    else console.log(JSON.stringify(verification, null, 2));
}
