import type { ExplainReport } from './ExplainReport';

/**
 * Formats an ExplainReport as a deterministically ordered JSON string.
 *
 * JSON explain output includes executionMode to expose
 * topology comparison semantics for CI-safe machine-readable interpretation.
 *
 * This function is:
 *   - pure (no side effects)
 *   - deterministic (strict key ordering)
 *
 * Phase 8C — Execution-Mode-Aware JSON Explain Surface
 */
export function formatExplainReportAsJSON(
  report: ExplainReport
): string {
  // Construct a new literal to strictly enforce deterministic key serialization order
  const ordered = {
    explainSurfaceVersion: report.explainSurfaceVersion,
    status: report.status,
    executionMode: report.executionMode,
    sections: report.sections,
  };

  return JSON.stringify(ordered, null, 2) + '\n';
}
