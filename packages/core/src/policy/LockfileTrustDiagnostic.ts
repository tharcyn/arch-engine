export type LockfileTrustFailureReason = 
  | 'MISSING_SIGNATURE'
  | 'UNKNOWN_SIGNER'
  | 'DISABLED_SIGNER'
  | 'UNAUTHORIZED_OPERATION'
  | 'ALGORITHM_MISMATCH'
  | 'MALFORMED_KEY_MATERIAL'
  | 'INVALID_SIGNATURE'
  | 'NON_CANONICAL_ORDER'
  | 'DUPLICATE_SIGNATURE';

export interface SignatureSetDiagnosticEntry {
  readonly signatureKeyId: string;
  readonly status: 'counted' | 'valid-but-non-counted' | 'retired' | 'duplicate' | 'invalid';
  readonly errorReason?: LockfileTrustFailureReason;
}

export interface LockfileTrustDiagnostic {
  readonly success: boolean;
  readonly signerKeyId?: string;
  readonly signerRole?: string;
  readonly signatureAlgorithm?: string;
  readonly evaluatedOperation: 'verify' | 'sign';
  readonly canonicalPayloadSurface?: 'registries';
  readonly failureReason?: LockfileTrustFailureReason;
  readonly message: string;
  readonly lifecycleStatus?: 'active' | 'verify-only' | 'retired';
  readonly signaturesPresent?: number;
  readonly signaturesVerified?: number;
  readonly signaturesRejected?: number;
  readonly quorumThreshold?: number;
  readonly quorumSatisfied?: boolean;
  readonly signatureSet?: SignatureSetDiagnosticEntry[];
  readonly isCanonical?: boolean;
}
