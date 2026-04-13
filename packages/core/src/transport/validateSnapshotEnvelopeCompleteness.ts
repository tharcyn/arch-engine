import { SnapshotEnvelope } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const SNAPSHOT_ENVELOPE_COMPLETENESS_VERSION = 'v2';

/**
 * Phase 4.10+4.11: SnapshotEnvelope Completeness Certification
 *
 * Validates all required identity surfaces on a SnapshotEnvelope.
 * Phase 4.11 adds: registrySourceHash, dependencyGraphShapeHash,
 * namespaceSetHash, explainabilityGraphHash.
 */
export function validateSnapshotEnvelopeCompleteness(envelope: SnapshotEnvelope): void {
  const missing: string[] = [];

  if (!envelope.snapshotClosureGraphHash) missing.push('snapshotClosureGraphHash');
  if (!envelope.namespaceTrustPolicyHash) missing.push('namespaceTrustPolicyHash');
  if (!envelope.policyStackFingerprint) missing.push('policyStackFingerprint');
  if (!envelope.manifestDigestSetHash) missing.push('manifestDigestSetHash');
  if (!envelope.loaderProtocolVersion) missing.push('loaderProtocolVersion');
  if (!envelope.registryProvenance || !Array.isArray(envelope.registryProvenance)) {
    missing.push('registryProvenance');
  }
  if (!envelope.namespaceTrustScopeHash) missing.push('namespaceTrustScopeHash');
  // Phase 4.11 fields
  if (!envelope.registrySourceHash) missing.push('registrySourceHash');
  if (!envelope.dependencyGraphShapeHash) missing.push('dependencyGraphShapeHash');
  if (!envelope.namespaceSetHash) missing.push('namespaceSetHash');
  if (!envelope.explainabilityGraphHash) missing.push('explainabilityGraphHash');
  // Phase 4.13 field
  if (!envelope.structureHash) missing.push('structureHash');

  if (missing.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_INCOMPLETE,
      message: `Snapshot envelope incomplete. Missing fields: ${missing.join(', ')}`,
      stage: 'snapshotEnvelopeValidation',
      contractVersion: SNAPSHOT_ENVELOPE_COMPLETENESS_VERSION
    });
  }
}
