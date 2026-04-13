import { SnapshotEnvelope, SNAPSHOT_ENVELOPE_VERSION } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const SNAPSHOT_ENVELOPE_FIELD_WHITELIST_CONTRACT = 'v2';

/**
 * Phase 4.12 Objective 2: SnapshotEnvelope Field Whitelist Invariant Guard
 *
 * Canonical allowed field set for SnapshotEnvelope v3.
 * Rejects unknown extra fields and missing required fields.
 * Forces explicit version bump for schema changes.
 */
export const SNAPSHOT_ENVELOPE_V3_REQUIRED_FIELDS: readonly string[] = [
  'activeTrustScopes',
  'closureGraphContractVersion',
  'dependencyGraphShapeHash',
  'explainabilityGraphHash',
  'loaderProtocolVersion',
  'manifestDigestSetHash',
  'namespaceTrustPolicyHash',
  'namespaceTrustPolicyVersion',
  'namespaceSetHash',
  'policyStackFingerprint',
  'registryProvenance',
  'registrySourceHash',
  'snapshotClosureGraphHash',
  'snapshotEnvelopeVersion',
  'structureHash'
] as const;

export const SNAPSHOT_ENVELOPE_V3_OPTIONAL_FIELDS: readonly string[] = [
  'closureProvenance',
  'namespaceTrustScopeHash'
] as const;

const ALL_ALLOWED_FIELDS = new Set([
  ...SNAPSHOT_ENVELOPE_V3_REQUIRED_FIELDS,
  ...SNAPSHOT_ENVELOPE_V3_OPTIONAL_FIELDS
]);

export function assertSnapshotEnvelopeFieldWhitelist(envelope: SnapshotEnvelope): void {
  const envelopeKeys = Object.keys(envelope).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  // Check for unknown fields
  const unknownFields: string[] = [];
  for (const key of envelopeKeys) {
    if (!ALL_ALLOWED_FIELDS.has(key)) {
      unknownFields.push(key);
    }
  }

  if (unknownFields.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_FIELD_DRIFT,
      message: `SnapshotEnvelope field drift detected. Unknown fields: [${unknownFields.join(', ')}]. ` +
        `Allowed fields for ${SNAPSHOT_ENVELOPE_VERSION}: [${[...ALL_ALLOWED_FIELDS].sort().join(', ')}]. ` +
        `Contract: ${SNAPSHOT_ENVELOPE_FIELD_WHITELIST_CONTRACT}`,
      stage: 'snapshotEnvelopeFieldWhitelist',
      contractVersion: SNAPSHOT_ENVELOPE_FIELD_WHITELIST_CONTRACT
    });
  }

  // Check for missing required fields
  const missingFields: string[] = [];
  for (const field of SNAPSHOT_ENVELOPE_V3_REQUIRED_FIELDS) {
    if (!(field in envelope)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_FIELD_DRIFT,
      message: `SnapshotEnvelope field drift detected. Missing required fields: [${missingFields.join(', ')}]. ` +
        `Contract: ${SNAPSHOT_ENVELOPE_FIELD_WHITELIST_CONTRACT}`,
      stage: 'snapshotEnvelopeFieldWhitelist',
      contractVersion: SNAPSHOT_ENVELOPE_FIELD_WHITELIST_CONTRACT
    });
  }
}
