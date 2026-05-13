/**
 * ═══════════════════════════════════════════════════════════
 *  Sort order check
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §10.4: records.ndjson MUST be sorted by
 *    (family, kind, primaryKey, payloadHash).
 *
 *  Reports `AGP_VERIFIER_SORT_ORDER_INVALID` on the first violating
 *  index. Verdict: invalid.
 */

import { findFirstSortViolation } from '../sort.js';
import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

export function runSortChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];
  const idx = findFirstSortViolation(bundle.records);
  if (idx >= 0) {
    const prev = bundle.records[idx - 1]!;
    const here = bundle.records[idx]!;
    issues.push({
      code: 'AGP_VERIFIER_SORT_ORDER_INVALID',
      severity: 'error',
      message: `records.ndjson is not sorted per spec §10.4 — line ${idx + 1} (${here.family}/${here.kind}) precedes line ${idx} (${prev.family}/${prev.kind}) in the expected order`,
      lineNumber: idx + 1,
      observed: `${here.family}/${here.kind} after ${prev.family}/${prev.kind}`,
      expected: 'lexicographic (family, kind, primaryKey, payloadHash)',
    });
  }
  return issues;
}
