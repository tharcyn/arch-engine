import type { PolicyPackExecutionContext } from './PolicyPackExecutionContext.js';
import type { PolicyPackEvaluationResult } from './PolicyPackEvaluationResult.js';

export type PolicyPackEvaluator = (context: PolicyPackExecutionContext) => PolicyPackEvaluationResult;
