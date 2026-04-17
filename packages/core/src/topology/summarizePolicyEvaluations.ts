import type { PolicyEvaluationResult } from './PolicyEvaluationResult';
import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { PolicyEvaluationSummary } from './PolicyEvaluationSummary';
import type { PolicyEvaluationSummaryStatus } from './PolicyEvaluationSummaryStatus';

/**
 * Deterministic, pure aggregation of policy evaluation results
 * into a canonical summary envelope.
 *
 * This function is:
 *   - pure (no side effects)
 *   - deterministic (same input → same output)
 *   - stable across execution order
 *
 * The input results array is passed through by reference — no
 * cloning, no mutation, no reordering.
 */
export function summarizePolicyEvaluations(
  results: readonly PolicyEvaluationResult[]
): PolicyEvaluationSummary {

  // ── Pack outcome counts ────────────────────────────────

  const totalPacks = results.length;

  const failedPacks = results.filter(
    (r) => r.success === false
  ).length;

  const warningPacks = results.filter(
    (r) =>
      r.success === true &&
      r.diagnostics.some((d) => d.severity === "warning")
  ).length;

  const passedPacks = results.filter(
    (r) =>
      r.success === true &&
      !r.diagnostics.some(
        (d) => d.severity === "warning" || d.severity === "error"
      )
  ).length;

  // ── Highest severity across all diagnostics ────────────

  const highestSeverity = resolveHighestSeverity(results);

  // ── Aggregate status ───────────────────────────────────

  const status: PolicyEvaluationSummaryStatus =
    failedPacks > 0
      ? "fail"
      : warningPacks > 0
        ? "warning"
        : "pass";

  return {
    evaluationSurfaceVersion: "1.0.0",
    status,
    totalPacks,
    passedPacks,
    warningPacks,
    failedPacks,
    highestSeverity,
    results,
  };
}

/**
 * Resolves the highest severity present across all diagnostics
 * in all results. Returns null when no diagnostics exist.
 */
function resolveHighestSeverity(
  results: readonly PolicyEvaluationResult[]
): PolicyEvaluationSeverity | null {
  let hasError = false;
  let hasWarning = false;
  let hasInfo = false;

  for (const result of results) {
    for (const diag of result.diagnostics) {
      if (diag.severity === "error") {
        hasError = true;
      } else if (diag.severity === "warning") {
        hasWarning = true;
      } else if (diag.severity === "info") {
        hasInfo = true;
      }
    }
  }

  if (hasError) return "error";
  if (hasWarning) return "warning";
  if (hasInfo) return "info";
  return null;
}
