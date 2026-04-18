import { GovernanceStateCapsuleRuntime } from '../../../../capsule/src/index.js';
import { CapsuleReplayRuntime } from '../../../../capsule/src/replay/index.js';
import { CapsuleTrustEnvelopeRuntime } from '../../../../capsule/src/trust/index.js';

export async function capsuleExportCommand(options: any) {
    const result = { status: GovernanceStateCapsuleRuntime.exportCapsule() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function capsuleInspectCommand(options: any) {
    const result = { status: GovernanceStateCapsuleRuntime.inspectCapsule() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function capsuleVerifyCommand(options: any) {
    const result = { status: GovernanceStateCapsuleRuntime.verifyCapsule() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function capsuleReplayCommand(options: any) {
    const result = { status: CapsuleReplayRuntime.replayCapsule() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function capsuleSignCommand(options: any) {
    const result = { status: CapsuleTrustEnvelopeRuntime.signCapsule() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function capsuleVerifySignatureCommand(options: any) {
    const result = { status: CapsuleTrustEnvelopeRuntime.verifySignature() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
