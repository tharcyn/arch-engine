export type ValidatorSeverity = 'info' | 'warning' | 'error';

export interface ValidatorDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: ValidatorSeverity;
  readonly field?: string;
}

export interface ValidatorResult {
  readonly validatorId: string;
  readonly success: boolean;
  readonly diagnostics: readonly ValidatorDiagnostic[];
}
