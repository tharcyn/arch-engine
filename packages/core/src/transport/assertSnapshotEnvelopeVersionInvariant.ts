import { SNAPSHOT_ENVELOPE_VERSION } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const SNAPSHOT_ENVELOPE_VERSION_INVARIANT_CONTRACT = 'v1';

/**
 * Phase 4.11 Objective 7: SnapshotEnvelope Schema Invariant Guard
 *
 * Verifies that the SnapshotEnvelope version matches the expected version.
 * Throws SNAPSHOT_ENVELOPE_VERSION_DRIFT if schema has been modified without
 * incrementing the version constant.
 *
 * Guards: transport compatibility, replay safety, cross-engine alignment,
 * protocol evolution correctness.
 */
export function assertSnapshotEnvelopeVersionInvariant(
  envelopeVersion: string,
  expectedVersion?: string
): void {
  const expected = expectedVersion || SNAPSHOT_ENVELOPE_VERSION;
  if (envelopeVersion !== expected) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_VERSION_DRIFT,
      message: `SnapshotEnvelope version drift: expected "${expected}", got "${envelopeVersion}". ` +
        `Schema may have been modified without version increment.`,
      stage: 'snapshotEnvelopeValidation',
      contractVersion: SNAPSHOT_ENVELOPE_VERSION_INVARIANT_CONTRACT
    });
  }
}
