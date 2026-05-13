/**
 * ═══════════════════════════════════════════════════════════
 *  snapshot.snapshotDigest verification
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §11.5 / conformance §4:
 *    1. Parse snapshot.json.
 *    2. Save embedded snapshotDigest.
 *    3. Set snapshot.payload.snapshotDigest := "" (the projection
 *       lives inside payload — but in the locked v1 layout the
 *       snapshotDigest lives at the outer envelope, so step 3 is a
 *       no-op against the projection function and we just hash
 *       payload-minus-emittedAt-minus-evidence/trust-records).
 *    4. Drop snapshot.payload.emittedAt.
 *    5. Filter snapshot.payload.records[] to factual-plane entries.
 *    6. JCS-canonicalise.
 *    7. SHA-256.
 *    8. Assert `"sha256:" + recomputed == embedded`.
 *
 *  Mismatch verdict: tampered.
 */

import { recomputeSnapshotDigest } from '../hash.js';
import type { AgpParsedBundle, AgpVerificationIssue } from '../types.js';

const SNAPSHOT_DIGEST_REGEX = /^sha256:[0-9a-f]{64}$/;

export interface DigestCheckResult {
  readonly issues: ReadonlyArray<AgpVerificationIssue>;
  readonly recomputed: string;
}

export function runDigestChecks(bundle: AgpParsedBundle): DigestCheckResult {
  const issues: AgpVerificationIssue[] = [];

  const embedded = bundle.snapshot.snapshotDigest;
  if (typeof embedded !== 'string' || !SNAPSHOT_DIGEST_REGEX.test(embedded)) {
    issues.push({
      code: 'AGP_VERIFIER_UNSUPPORTED_HASH_ALGORITHM',
      severity: 'error',
      message: `snapshot.snapshotDigest missing or uses unsupported algorithm prefix: ${JSON.stringify(embedded)}`,
      path: '$.snapshotDigest',
      observed: embedded,
      expected: 'sha256:<64-hex>',
    });
    return { issues, recomputed: '' };
  }

  let recomputed: string;
  try {
    recomputed = recomputeSnapshotDigest(
      bundle.snapshot.payload as unknown as Record<string, unknown>,
    );
  } catch (err) {
    issues.push({
      code: 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH',
      severity: 'error',
      message: `Failed to recompute snapshotDigest: ${(err as Error).message}`,
      path: '$.snapshotDigest',
    });
    return { issues, recomputed: '' };
  }

  if (recomputed !== embedded) {
    issues.push({
      code: 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH',
      severity: 'error',
      message:
        'snapshot.snapshotDigest does not match the SHA-256 of the canonical factual projection',
      path: '$.snapshotDigest',
      observed: embedded,
      expected: recomputed,
      fix:
        'Bundle has been tampered with, or the emitter used a different canonicalisation. Re-emit from the source JSON v2.',
    });
  }

  return { issues, recomputed };
}
