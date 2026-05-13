/**
 * ═══════════════════════════════════════════════════════════
 *  Record id format check
 * ═══════════════════════════════════════════════════════════
 *
 *  The full identity verification (`id == agp:family:kind:payloadHash`)
 *  lives in hashChecks.ts because it depends on recomputed
 *  payloadHash. This module exists for a *format-only* fast-fail
 *  that runs even when the payload itself is too malformed to
 *  hash.
 *
 *  Issue: AGP_VERIFIER_RECORD_ID_FORMAT_INVALID
 *  Verdict: invalid (or tampered, depending on whether the formula
 *           portion is wrong vs the prefix structure).
 */

import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

const ID_FORMAT_REGEX =
  /^agp:(node|edge|adapter_evidence|diagnostic|drift|policy_finding|provenance|observation|attestation):[a-z][a-z0-9_]*:b3:[0-9a-f]{64}$/;

export function runIdentityFormatChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    if (typeof r.id !== 'string') continue;
    if (!ID_FORMAT_REGEX.test(r.id)) {
      issues.push({
        code: 'AGP_VERIFIER_RECORD_ID_FORMAT_INVALID',
        severity: 'error',
        message: `records.ndjson line ${i + 1}: id does not match formula agp:<family>:<kind>:b3:<64-hex>`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber: i + 1,
        observed: r.id,
        expected: 'agp:<family>:<kind>:b3:<64-hex>',
      });
    }
  }

  return issues;
}
