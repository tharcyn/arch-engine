import type { PolicyEvaluationSummary } from './PolicyEvaluationSummary';
import type { GovernanceReport } from './GovernanceReport';

/**
 * Builds a GovernanceReport from a PolicyEvaluationSummary.
 *
 * Pure projection — no mutation, no side effects.
 * The results array is passed through by reference.
 *
 * Phase 6A — Governance Report Surface
 */
export function buildGovernanceReport(
  summary: PolicyEvaluationSummary
): GovernanceReport {
  return {
    reportSurfaceVersion: "1.0.0",
    status: summary.status,
    totalPacks: summary.totalPacks,
    passedPacks: summary.passedPacks,
    warningPacks: summary.warningPacks,
    failedPacks: summary.failedPacks,
    highestSeverity: summary.highestSeverity,
    results: summary.results,
  };
}
