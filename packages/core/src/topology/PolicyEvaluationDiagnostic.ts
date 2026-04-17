import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';

export interface PolicyEvaluationDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: PolicyEvaluationSeverity;
}
