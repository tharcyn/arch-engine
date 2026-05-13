/**
 * ═══════════════════════════════════════════════════════════
 *  Hash and identity checks
 * ═══════════════════════════════════════════════════════════
 *
 *  For each record:
 *    - recompute payloadHash := b3(JCS(payload))
 *    - compare to record.payloadHash → tampered on mismatch
 *    - compute expected id := "agp:" + family + ":" + kind + ":" + payloadHash
 *    - compare to record.id → tampered on mismatch
 *
 *  These checks fire even when schema validation passed; conversely,
 *  if schema validation already failed for the same record (e.g.
 *  missing payloadHash) we surface only the schema issue and skip
 *  the hash recomputation for that record to avoid noise.
 */

import { recomputePayloadHash, expectedRecordId } from '../hash.js';
import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

const PAYLOAD_HASH_REGEX = /^b3:[0-9a-f]{64}$/;

export function runHashChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    const lineNumber = i + 1;

    // Skip records that are too malformed to hash (schema check
    // will surface the underlying issue).
    if (
      !r ||
      typeof r !== 'object' ||
      typeof r.payload !== 'object' ||
      r.payload === null
    ) {
      continue;
    }
    if (typeof r.payloadHash !== 'string') continue;
    if (typeof r.family !== 'string' || typeof r.kind !== 'string') continue;
    if (typeof r.id !== 'string') continue;

    // payloadHash prefix sanity: only b3 supported in AGP v1.
    if (!PAYLOAD_HASH_REGEX.test(r.payloadHash)) {
      issues.push({
        code: 'AGP_VERIFIER_UNSUPPORTED_HASH_ALGORITHM',
        severity: 'error',
        message: `records.ndjson line ${lineNumber}: payloadHash uses unsupported algorithm prefix or malformed hex: ${r.payloadHash}`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber,
        observed: r.payloadHash,
        expected: 'b3:<64-hex>',
      });
      continue;
    }

    // Recompute payloadHash independently.
    let recomputed: string;
    try {
      recomputed = recomputePayloadHash(r.payload);
    } catch (err) {
      issues.push({
        code: 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH',
        severity: 'error',
        message: `records.ndjson line ${lineNumber}: failed to recompute payloadHash: ${(err as Error).message}`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber,
      });
      continue;
    }

    if (recomputed !== r.payloadHash) {
      issues.push({
        code: 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH',
        severity: 'error',
        message: `records.ndjson line ${lineNumber}: payloadHash mismatch — content has been altered or canonicalisation differs`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber,
        observed: r.payloadHash,
        expected: recomputed,
      });
      // Identity check below will compare against r.payloadHash
      // (declared) — when payloadHash itself is tampered, the id
      // can still match it textually but the record is already
      // tagged tampered, so we don't double-report.
    }

    // Identity check: id == "agp:family:kind:payloadHash" using the
    // record's *declared* payloadHash. If declared payloadHash has
    // been tampered but id matches it, the payload mismatch above
    // catches it. If id is malformed independently, we flag here.
    const expected = expectedRecordId(r.family, r.kind, r.payloadHash);
    if (r.id !== expected) {
      issues.push({
        code: 'AGP_VERIFIER_RECORD_ID_MISMATCH',
        severity: 'error',
        message: `records.ndjson line ${lineNumber}: record id does not match agp:family:kind:payloadHash formula`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber,
        observed: r.id,
        expected,
      });
    }
  }

  return issues;
}
