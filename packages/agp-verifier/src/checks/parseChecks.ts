/**
 * ═══════════════════════════════════════════════════════════
 *  Parse / structural checks
 * ═══════════════════════════════════════════════════════════
 *
 *  Reserved for additional structural checks beyond what
 *  readBundle.ts catches at IO/parse time. Currently this module
 *  catches:
 *    - empty records.ndjson  → invalid (every bundle MUST have at
 *                              least one provenance record)
 *
 *  Per-line JSON parse failures are surfaced by readBundle.ts as
 *  AGP_VERIFIER_RECORD_PARSE_FAILED.
 */

import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

export function runStructuralChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  if (bundle.records.length === 0) {
    issues.push({
      code: 'AGP_VERIFIER_RECORD_PARSE_FAILED',
      severity: 'error',
      message:
        'records.ndjson is empty. A valid AGP bundle MUST contain at least one record (provenance).',
      lineNumber: 1,
      fix: 'Re-emit the bundle from a non-empty Arch-Engine JSON v2 envelope.',
    });
  }

  return issues;
}
