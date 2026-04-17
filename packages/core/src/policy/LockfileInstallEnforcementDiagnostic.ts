import type { LockfileTrustDiagnostic } from './LockfileTrustDiagnostic';

export type LockfileEnforcementMode = 'permissive' | 'require-signature' | 'require-signature-and-freshness';

export interface LockfileInstallEnforcementDiagnostic {
  readonly allowed: boolean;
  readonly mode: LockfileEnforcementMode;
  readonly lockfilePresent: boolean;
  readonly signaturePresent: boolean;
  readonly verificationSuccess?: boolean;
  readonly freshnessSuccess?: boolean;
  readonly signerKeyId?: string;
  readonly failureReason?: string;
  readonly message: string;
  readonly verificationDiagnostic?: LockfileTrustDiagnostic;
}
