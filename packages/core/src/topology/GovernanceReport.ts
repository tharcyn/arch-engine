import type { PolicyEvaluationSummaryStatus } from './PolicyEvaluationSummaryStatus';
import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { PolicyEvaluationResult } from './PolicyEvaluationResult';

/**
 * Canonical governance report envelope.
 *
 * This is the terminal output contract for a policy evaluation run.
 * It carries the aggregated summary fields and the original results
 * array in insertion order. Downstream consumers (CLI formatters,
 * JSON serializers, CI gates) read this contract — nothing else.
 *
 * Phase 6A — Governance Report Surface
 */
export interface GovernanceReport {

  readonly reportSurfaceVersion: "1.0.0";

  readonly status: PolicyEvaluationSummaryStatus;

  readonly totalPacks: number;

  readonly passedPacks: number;

  readonly warningPacks: number;

  readonly failedPacks: number;

  readonly highestSeverity: PolicyEvaluationSeverity | null;

  readonly results: readonly PolicyEvaluationResult[];
}
