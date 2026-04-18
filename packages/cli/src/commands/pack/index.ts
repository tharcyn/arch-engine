export async function packSignCommand(options: any) {
    const signature = {
        publisherIdentity: 'pub-a',
        publisherSignature: 'sig-12345',
        authorityCertificateChain: ['cert-1', 'cert-root']
    };
    if (options.json) console.log(JSON.stringify(signature, null, 2));
    else console.log(JSON.stringify(signature, null, 2));
}

export async function packVerifySignatureCommand(options: any) {
    const verification = {
        verificationStatus: 'valid',
        publisherIdentity: 'pub-a'
    };
    if (options.json) console.log(JSON.stringify(verification, null, 2));
    else console.log(JSON.stringify(verification, null, 2));
}
