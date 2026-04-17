import type { GovernanceReport } from './GovernanceReport';

/**
 * Formats a GovernanceReport as a human-readable CLI output string.
 *
 * This function is:
 *   - pure (no console.log, no side effects)
 *   - deterministic (same input → same output)
 *   - terminal-safe (uses \n, not platform-specific newlines)
 *   - CI-safe (no color codes, no escape sequences)
 *
 * Pack results appear in insertion order — no sorting applied.
 *
 * Phase 6B — CLI Output Formatter Surface
 */
export function formatGovernanceReportForCLI(
  report: GovernanceReport
): string {
  const lines: string[] = [];

  // ── Header: status ─────────────────────────────────────
  lines.push(`Status: ${report.status}`);
  lines.push('');

  // ── Pack counts ────────────────────────────────────────
  lines.push(`Policy Packs Evaluated: ${report.totalPacks}`);
  lines.push(`Passed: ${report.passedPacks}`);
  lines.push(`Warnings: ${report.warningPacks}`);
  lines.push(`Failed: ${report.failedPacks}`);
  lines.push('');

  // ── Highest severity ───────────────────────────────────
  lines.push(`Highest Severity: ${report.highestSeverity ?? 'none'}`);
  lines.push('');

  // ── Pack results ───────────────────────────────────────
  lines.push('Policy Pack Results:');
  lines.push('');

  for (const result of report.results) {
    lines.push(result.policyPackId);
    lines.push(`  success: ${result.success}`);

    if (result.diagnostics.length > 0) {
      lines.push('  diagnostics:');
      for (const diag of result.diagnostics) {
        lines.push(`    - [${diag.severity}] ${diag.code}: ${diag.message}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
