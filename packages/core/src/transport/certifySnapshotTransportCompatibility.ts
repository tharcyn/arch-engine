import { SnapshotEnvelope } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const TRANSPORT_COMPATIBILITY_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.13 Objective 6: SnapshotEnvelope Transport Compatibility Certification
 *
 * Final transport-safety gate. Verifies all required pieces for
 * cross-cluster replay, cross-engine transport, and federation compatibility.
 */
export function certifySnapshotTransportCompatibility(
  envelope: SnapshotEnvelope,
  structureHash: string
): void {
  const failures: string[] = [];

  // loaderProtocolVersion must be present and non-empty
  if (!envelope.loaderProtocolVersion) {
    failures.push('loaderProtocolVersion missing');
  }

  // snapshotEnvelopeVersion must be present and non-empty
  if (!envelope.snapshotEnvelopeVersion) {
    failures.push('snapshotEnvelopeVersion missing');
  }

  // structureHash must be present
  if (!structureHash || typeof structureHash !== 'string' || structureHash.length !== 64) {
    failures.push(`structureHash invalid (expected 64-char SHA256, got "${structureHash}")`);
  }

  // policyStackFingerprint must be present
  if (!envelope.policyStackFingerprint) {
    failures.push('policyStackFingerprint missing');
  }

  // closureGraphHash must be present
  if (!envelope.snapshotClosureGraphHash) {
    failures.push('snapshotClosureGraphHash missing');
  }

  if (failures.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_TRANSPORT_COMPATIBILITY_FAILURE,
      message: `Snapshot transport compatibility failure: [${failures.join('; ')}]. ` +
        `Contract: ${TRANSPORT_COMPATIBILITY_CONTRACT_VERSION}`,
      stage: 'snapshotTransportCompatibility',
      contractVersion: TRANSPORT_COMPATIBILITY_CONTRACT_VERSION
    });
  }
}
