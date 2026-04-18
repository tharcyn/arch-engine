import { VerificationNodeRuntime } from '../../../../trust-federation/src/verification-node/index.js';
import { PortableCertificationVerifier } from '../../../../verifier-sdk/src/index.js';
import { StandaloneVerificationRuntime } from '../../../../verifier-sdk/src/binary/index.js';
import { ExternalCertificationAdapterRuntime } from '../../../../interoperability/src/external-verifiers/index.js';

export async function verifyCertificationCommand(options: any) {
    const result = { status: VerificationNodeRuntime.verifyCertification() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function verifyPortableCommand(options: any) {
    const result = { status: PortableCertificationVerifier.verifyPortable() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function verifyOfflineCommand(options: any) {
    const result = { status: StandaloneVerificationRuntime.verifyOffline() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function verifyExternalCommand(options: any) {
    const result = { status: ExternalCertificationAdapterRuntime.verifyExternal() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
