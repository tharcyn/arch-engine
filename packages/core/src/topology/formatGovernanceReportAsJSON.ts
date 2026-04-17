import type { GovernanceReport } from './GovernanceReport';

/**
 * Formats a GovernanceReport as a deterministic JSON string.
 *
 * This function is:
 *   - pure (no console.log, no side effects)
 *   - deterministic (same input → same output)
 *   - stable across runtimes (2-space indent, trailing \n)
 *   - CI-safe (returns string only)
 *
 * Property order in the output matches the specified contract:
 *   reportSurfaceVersion → status → highestSeverity →
 *   totalPacks → passedPacks → warningPacks → failedPacks → results
 *
 * Phase 6C — JSON Output Mode Surface
 */
export function formatGovernanceReportAsJSON(
  report: GovernanceReport
): string {
  // Construct object literal in spec-required key order to
  // guarantee JSON.stringify preserves insertion ordering.
  const ordered = {
    reportSurfaceVersion: report.reportSurfaceVersion,
    status: report.status,
    highestSeverity: report.highestSeverity,
    totalPacks: report.totalPacks,
    passedPacks: report.passedPacks,
    warningPacks: report.warningPacks,
    failedPacks: report.failedPacks,
    results: report.results,
  };

  return JSON.stringify(ordered, null, 2) + "\n";
}
