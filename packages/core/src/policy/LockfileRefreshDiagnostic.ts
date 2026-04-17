export interface LockfileRefreshDiagnostic {
  readonly success: boolean;
  readonly driftDetected: boolean;
  readonly lockfileRewritten: boolean;
  readonly signatureInvalidated: boolean;
  readonly resignAttempted: boolean;
  readonly resignSuccess?: boolean;
  readonly signerKeyId?: string;
  readonly error?: string;
  readonly message: string;
}
