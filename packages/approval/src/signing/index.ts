export class DecisionPacketSigningRuntime {
    static signDecision(): string { return 'decision-signed'; }
    static verifySignature(): string { return 'signature-verified'; }
}

export class ApprovalSignatureEnvelope {}
export class DecisionPacketSigner {}
export class DecisionPacketVerificationRuntime {}
