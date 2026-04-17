import type { GovernanceReport } from './GovernanceReport';
import type { GovernanceExitCode } from './GovernanceExitCode';

/**
 * Maps a GovernanceReport status to a process exit code.
 *
 *   "pass"    → 0
 *   "warning" → 0
 *   "fail"    → 1
 *
 * This function is pure, deterministic, and side-effect free.
 *
 * Phase 6E — Exit Code Mapping Surface
 */
export function mapGovernanceReportToExitCode(
  report: GovernanceReport
): GovernanceExitCode {
  if (report.status === "fail") {
    return 1;
  }
  return 0;
}
