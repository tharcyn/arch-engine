import type { ExplainReport } from './ExplainReport';

/**
 * Formats an ExplainReport as a human-readable CLI output string.
 *
 * This function is:
 *   - pure (no console.log, no side effects)
 *   - deterministic (same input → same output)
 *   - terminal-safe (uses \n, not platform-specific newlines)
 *   - CI-safe (no color codes, no escape sequences)
 *
 * Sections appear in insertion order — no sorting applied.
 *
 * Phase 6D — Explain Mode Surface
 */
export function formatExplainReportForCLI(
  explain: ExplainReport
): string {
  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────
  lines.push('Explain Mode Output');
  lines.push('');

  // ── Status ─────────────────────────────────────────────
  lines.push(`Status: ${explain.status}`);
  lines.push(`Execution Mode: ${explain.executionMode}`);
  lines.push('');

  // ── Highest severity ───────────────────────────────────
  lines.push(`Highest Severity: ${explain.highestSeverity ?? 'none'}`);
  lines.push('');

  // ── Section header ─────────────────────────────────────
  lines.push('Policy Pack Analysis:');
  lines.push('');

  // ── Sections ───────────────────────────────────────────
  for (const section of explain.sections) {
    lines.push(section.policyPackId);
    lines.push(`  success: ${section.success}`);

    if (section.diagnostics.length > 0) {
      lines.push('  diagnostics:');
      for (const diag of section.diagnostics) {
        lines.push(`    - [${diag.severity}] ${diag.code}: ${diag.message}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
