export interface TrustPolicyConfig {
    readonly requireSignatures?: boolean;
    readonly enforcementMode?: 'permissive' | 'require-signature' | 'require-signature-and-freshness';
    readonly quorum?: number | 'all';
    readonly allowedNamespaces?: readonly string[];
    readonly trustedRegistries?: readonly string[];
    readonly allowRemoteExecution?: boolean;
    readonly trustedLockfileKeys?: Record<string, string>;
    readonly signerLockfileKeys?: Record<string, string>;
    readonly lockfileSigners?: Record<string, import('../policy/LockfileSignerConfig').LockfileSignerConfig>;
}
