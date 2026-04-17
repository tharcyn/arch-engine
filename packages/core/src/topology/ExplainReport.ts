import type { PolicyEvaluationSummaryStatus } from './PolicyEvaluationSummaryStatus';
import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { ExplainSection } from './ExplainSection';
import type { ExecutionInputMode } from './ExecutionInputMode';

/**
 * Canonical explain-mode report envelope.
 *
 * Provides structured reasoning output describing which policy
 * packs triggered, which diagnostics contributed, and how
 * severity influenced the aggregate status.
 *
 * Phase 6D — Explain Mode Surface
 */
export interface ExplainReport {

  readonly explainSurfaceVersion: "1.0.0";

  // Reuses the existing governance summary status contract.
  // Explain mode does not define a separate explain-only status type.
  readonly status: PolicyEvaluationSummaryStatus;

  // executionMode exposes topology comparison semantics
  // enabling snapshot-native governance interpretation
  // without altering diff or policy evaluation behavior
  readonly executionMode: ExecutionInputMode;

  readonly highestSeverity: PolicyEvaluationSeverity | null;

  readonly sections: readonly ExplainSection[];
}
