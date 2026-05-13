/**
 * ═══════════════════════════════════════════════════════════
 *  Absolute path scan
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §10.6 + §21.1:
 *    AGP bundles MUST NOT contain absolute paths in any record
 *    payload or snapshot field. The verifier scans every string
 *    value recursively. URL-style strings ($schema, predicateType,
 *    repository.url, homepage, etc.) are tolerated.
 *
 *  Issue: AGP_VERIFIER_ABSOLUTE_PATH_LEAK
 *  Verdict: invalid
 */

import { scanForAbsolutePaths } from '../paths.js';
import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

export function runPathChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  // Scan snapshot.json — but exclude the snapshotDigest envelope
  // since it's a sha256:<hex> string that shouldn't trigger our
  // detector anyway. We pass the whole object; path scanner skips
  // URL-style keys.
  const snapHit = scanForAbsolutePaths(bundle.snapshot, '$.snapshot');
  if (snapHit) {
    issues.push({
      code: 'AGP_VERIFIER_ABSOLUTE_PATH_LEAK',
      severity: 'error',
      message: `snapshot.json contains an absolute path: ${snapHit.value}`,
      path: snapHit.path,
      observed: snapHit.value,
      fix: 'AGP bundles MUST contain only repo-relative POSIX paths. Re-emit from the source.',
    });
  }

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    const hit = scanForAbsolutePaths(r, `$.records[${i}]`);
    if (hit) {
      issues.push({
        code: 'AGP_VERIFIER_ABSOLUTE_PATH_LEAK',
        severity: 'error',
        message: `records.ndjson line ${i + 1} contains an absolute path: ${hit.value}`,
        path: hit.path,
        recordId: typeof r.id === 'string' ? r.id : undefined,
        family: r.family,
        kind: r.kind,
        lineNumber: i + 1,
        observed: hit.value,
        fix: 'AGP bundles MUST contain only repo-relative POSIX paths.',
      });
    }
  }

  return issues;
}
