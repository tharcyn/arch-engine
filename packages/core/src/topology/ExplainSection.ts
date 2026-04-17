import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { PolicyEvaluationDiagnostic } from './PolicyEvaluationDiagnostic';

/**
 * A single per-pack explanation section.
 *
 * Carries the pack outcome, its highest diagnostic severity,
 * and the original diagnostics array by reference.
 *
 * Phase 6D — Explain Mode Surface
 */
export interface ExplainSection {

  readonly policyPackId: string;

  readonly success: boolean;

  readonly highestSeverity: PolicyEvaluationSeverity | null;

  readonly diagnostics: readonly PolicyEvaluationDiagnostic[];
}
