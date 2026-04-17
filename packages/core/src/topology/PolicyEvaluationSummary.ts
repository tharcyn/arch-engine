import type { PolicyEvaluationSummaryStatus } from './PolicyEvaluationSummaryStatus';
import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { PolicyEvaluationResult } from './PolicyEvaluationResult';

export interface PolicyEvaluationSummary {

  readonly evaluationSurfaceVersion: "1.0.0";

  readonly status: PolicyEvaluationSummaryStatus;

  readonly totalPacks: number;

  readonly passedPacks: number;

  readonly warningPacks: number;

  readonly failedPacks: number;

  readonly highestSeverity: PolicyEvaluationSeverity | null;

  readonly results: readonly PolicyEvaluationResult[];
}
