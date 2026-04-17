import type { GovernanceReport } from './GovernanceReport';
import type { PolicyEvaluationSeverity } from './PolicyEvaluationSeverity';
import type { PolicyEvaluationResult } from './PolicyEvaluationResult';
import type { ExplainReport } from './ExplainReport';
import type { ExplainSection } from './ExplainSection';
import type { ExecutionInputMode } from './ExecutionInputMode';

/**
 * Builds an ExplainReport from a GovernanceReport.
 *
 * Each result is projected into an ExplainSection with a
 * per-pack highestSeverity computed from its diagnostics.
 * The diagnostics array is passed through by reference.
 *
 * This function is:
 *   - pure (no side effects)
 *   - deterministic (same input → same output)
 *   - stable across execution order
 *
 * Phase 6D — Explain Mode Surface
 */
export function buildExplainReport(
  report: GovernanceReport,
  executionMode: ExecutionInputMode
): ExplainReport {
  const sections: ExplainSection[] = report.results.map(
    (result) => buildSection(result)
  );

  return {
    explainSurfaceVersion: "1.0.0",
    status: report.status,
    executionMode,
    highestSeverity: report.highestSeverity,
    sections,
  };
}

/**
 * Computes the highest severity across a single pack's diagnostics.
 */
function buildSection(result: PolicyEvaluationResult): ExplainSection {
  return {
    policyPackId: result.policyPackId,
    success: result.success,
    highestSeverity: resolvePackSeverity(result),
    diagnostics: result.diagnostics,
  };
}

/**
 * Resolves the highest severity for a single result's diagnostics.
 * error > warning > info > null
 */
function resolvePackSeverity(
  result: PolicyEvaluationResult
): PolicyEvaluationSeverity | null {
  let hasError = false;
  let hasWarning = false;
  let hasInfo = false;

  for (const diag of result.diagnostics) {
    if (diag.severity === "error") {
      hasError = true;
    } else if (diag.severity === "warning") {
      hasWarning = true;
    } else if (diag.severity === "info") {
      hasInfo = true;
    }
  }

  if (hasError) return "error";
  if (hasWarning) return "warning";
  if (hasInfo) return "info";
  return null;
}
