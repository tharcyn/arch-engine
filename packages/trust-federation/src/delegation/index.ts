export class DelegatedTrustPropagationRuntime {
    static delegateTrust(): string { return 'trust-delegated'; }
}

export class RevocationPropagationRuntime {
    static revokeTrust(): string { return 'trust-revoked'; }
}

export class AuthorityTrustQuorumValidator {}
export class IssuerConsensusVerifier {}
