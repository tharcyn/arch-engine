export class CapsuleTrustEnvelopeRuntime {
    static signCapsule(): string { return 'capsule-signed'; }
    static verifySignature(): string { return 'signature-verified'; }
}

export class CapsuleSignatureEnvelope {}
export class CapsuleAuthorityVerifier {}
export class CapsuleFederationCompatibilityResolver {}
