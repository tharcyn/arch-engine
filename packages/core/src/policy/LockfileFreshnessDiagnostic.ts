export interface LockfileFreshnessDiagnostic {
  readonly isFresh: boolean;
  readonly lockfilePresent: boolean;
  readonly signaturePresent: boolean;
  readonly signerKeyId?: string;
  readonly canonicalPayloadSurface: string;
  readonly changeDetected: boolean;
  readonly driftSummary?: string;
  readonly message: string;
}
