/**
 * ═══════════════════════════════════════════════════════════
 *  Plane invariant checks
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §7.11 + conformance §7:
 *    factual = node, edge, adapter_evidence, diagnostic, drift,
 *              policy_finding
 *    evidence = observation
 *    trust    = provenance, attestation
 *
 *  A record whose plane disagrees with its family is `invalid`.
 *  A manifest entry that lists a trust/evidence record inside the
 *  digest projection is implicitly tested by the digest check; the
 *  plane check here ensures the *record-stream* labels are correct.
 */

import type {
  AgpParsedBundle,
  AgpRecordFamily,
  AgpVerificationIssue,
} from '../types.js';

const FAMILY_TO_PLANE: Readonly<Record<AgpRecordFamily, string>> = {
  node: 'factual',
  edge: 'factual',
  adapter_evidence: 'factual',
  diagnostic: 'factual',
  drift: 'factual',
  policy_finding: 'factual',
  provenance: 'trust',
  observation: 'evidence',
  attestation: 'trust',
};

export function runPlaneChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    if (typeof r.family !== 'string' || typeof r.plane !== 'string') continue;
    const expected = FAMILY_TO_PLANE[r.family as AgpRecordFamily];
    if (expected === undefined) continue; // schema check covers it
    if (r.plane !== expected) {
      issues.push({
        code: 'AGP_VERIFIER_PLANE_INVARIANT_FAILED',
        severity: 'error',
        message: `records.ndjson line ${i + 1}: family ${r.family} must have plane ${expected}, got ${r.plane}`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber: i + 1,
        observed: r.plane,
        expected,
      });
    }
  }

  const manifest = (bundle.snapshot.payload.records ?? []) as ReadonlyArray<{
    id: string;
    family: AgpRecordFamily;
    plane: string;
  }>;
  for (const m of manifest) {
    if (typeof m.family !== 'string' || typeof m.plane !== 'string') continue;
    const expected = FAMILY_TO_PLANE[m.family];
    if (expected === undefined) continue;
    if (m.plane !== expected) {
      issues.push({
        code: 'AGP_VERIFIER_PLANE_INVARIANT_FAILED',
        severity: 'error',
        message: `snapshot.payload.records[] entry for ${m.id}: family ${m.family} must have plane ${expected}, got ${m.plane}`,
        recordId: m.id,
        family: m.family,
        observed: m.plane,
        expected,
      });
    }
  }

  return issues;
}
