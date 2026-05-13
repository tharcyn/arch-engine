/**
 * ═══════════════════════════════════════════════════════════
 *  Attestation subject check (optional)
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §16.2 #13 / conformance §10:
 *    - If an `attestation` record exists and its
 *      `payload.subject.digest.sha256` is set, it MUST equal the
 *      hex part of `snapshot.snapshotDigest` (i.e. without the
 *      `sha256:` prefix).
 *    - If the attestation file is referenced via `envelopeRef`,
 *      we do NOT dereference it (no signature verification in
 *      MVP), but we surface a warning so callers can know an
 *      external integrity check remains unrun.
 *
 *  No-record-no-issue: bundles without attestation records pass
 *  this check trivially.
 */

import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

export function runAttestationChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  const expectedHex = extractHex(bundle.snapshot.snapshotDigest);
  if (!expectedHex) return issues;

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    if (r.family !== 'attestation') continue;

    const payload = r.payload as Record<string, unknown>;
    const subject = payload?.subject as Record<string, unknown> | undefined;
    const digest = subject?.digest as Record<string, unknown> | undefined;
    const sha256 = typeof digest?.sha256 === 'string' ? (digest.sha256 as string) : undefined;

    if (sha256) {
      const observedHex = sha256.startsWith('sha256:') ? sha256.slice(7) : sha256;
      if (observedHex !== expectedHex) {
        issues.push({
          code: 'AGP_VERIFIER_ATTESTATION_SUBJECT_MISMATCH',
          severity: 'error',
          message: `Attestation record ${r.id} subject digest does not match snapshot.snapshotDigest`,
          recordId: r.id,
          family: r.family,
          kind: r.kind,
          lineNumber: i + 1,
          observed: observedHex,
          expected: expectedHex,
        });
      }
    }

    // envelopeRef: do not dereference; surface a warning so callers
    // know external verification is pending.
    const envelopeRef =
      typeof (payload as Record<string, unknown>).envelopeRef === 'string'
        ? (payload as Record<string, unknown>).envelopeRef
        : undefined;
    if (envelopeRef) {
      issues.push({
        code: 'AGP_VERIFIER_ATTESTATION_ENVELOPE_UNVERIFIED',
        severity: 'warning',
        message: `Attestation record ${r.id} references envelopeRef ${JSON.stringify(envelopeRef)}; MVP verifier does not dereference attestation envelopes`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
        lineNumber: i + 1,
        observed: envelopeRef,
        fix: 'Use a downstream signature/SLSA verifier to validate the external envelope; the AGP MVP verifier intentionally does not.',
      });
    }
  }

  return issues;
}

function extractHex(digest: string | undefined): string | undefined {
  if (typeof digest !== 'string') return undefined;
  if (!digest.startsWith('sha256:')) return undefined;
  const hex = digest.slice(7);
  if (!/^[0-9a-f]{64}$/.test(hex)) return undefined;
  return hex;
}
