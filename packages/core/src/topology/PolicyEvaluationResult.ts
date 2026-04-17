import type { PolicyEvaluationDiagnostic } from './PolicyEvaluationDiagnostic';

export interface PolicyEvaluationResult {
  readonly policyPackId: string;
  readonly success: boolean;
  readonly diagnostics: readonly PolicyEvaluationDiagnostic[];
}
