export type SignerLifecycleStatus = 'active' | 'verify-only' | 'retired';

export interface LockfileSignerConfig {
  readonly key: string;
  readonly algorithm?: 'ed25519';
  readonly enabled?: boolean;
  readonly allowedOperations?: readonly ('verify' | 'sign')[];
  readonly role?: string;
  readonly status?: SignerLifecycleStatus;
  readonly replacementKeyId?: string;
  readonly note?: string;
}

export interface ResolvedSignerIdentity {
  readonly pem: string;
  readonly algorithm: 'ed25519';
  readonly enabled: boolean;
  readonly allowedOperations: readonly ('verify' | 'sign')[];
  readonly role?: string;
  readonly status?: SignerLifecycleStatus;
  readonly replacementKeyId?: string;
  readonly note?: string;
}
