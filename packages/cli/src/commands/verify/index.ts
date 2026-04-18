import { VerificationNodeRuntime } from '../../../../trust-federation/src/verification-node/index.js';

export async function verifyCertificationCommand(options: any) {
    const result = { status: VerificationNodeRuntime.verifyCertification() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
