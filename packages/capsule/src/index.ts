export class GovernanceStateCapsuleRuntime {
    static exportCapsule(): string { return 'capsule-exported'; }
    static inspectCapsule(): string { return 'capsule-inspected'; }
    static verifyCapsule(): string { return 'capsule-verified'; }
}

export class CapsuleDescriptor {}
export class CapsuleIntegrityEnvelope {}
export class CapsuleReplaySurface {}
export class CapsuleVerificationRuntime {}
