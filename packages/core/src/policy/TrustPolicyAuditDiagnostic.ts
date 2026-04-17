export type TrustPolicyReadiness = 'healthy' | 'degraded' | 'invalid';
export type TrustPolicyFindingSeverity = 'error' | 'warning' | 'info';

export interface TrustPolicyFinding {
  readonly code: string;
  readonly severity: TrustPolicyFindingSeverity;
  readonly message: string;
  readonly keyId?: string;
}

export interface TrustPolicyAuditDiagnostic {
  readonly readiness: TrustPolicyReadiness;
  readonly findings: TrustPolicyFinding[];
  readonly totalSigners: number;
  readonly enabledVerifiers: number;
  readonly enabledSigners: number;
  readonly strictEnforcement: boolean;
}
