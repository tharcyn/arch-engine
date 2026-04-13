import { SnapshotEnvelope } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const IDENTITY_SURFACE_SET_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.13 Objective 2: Envelope Identity-Surface Membership Guard
 *
 * Canonical set of identity-surface fields on SnapshotEnvelope.
 * These are the hash/fingerprint fields that form the envelope's
 * cryptographic identity. No removal, addition, or renaming permitted
 * without explicit contract version bump.
 */
export const CANONICAL_IDENTITY_SURFACES = [
  'dependencyGraphShapeHash',
  'explainabilityGraphHash',
  'manifestDigestSetHash',
  'namespaceTrustPolicyHash',
  'namespaceSetHash',
  'policyStackFingerprint',
  'registrySourceHash',
  'snapshotClosureGraphHash'
] as const;

export type CanonicalIdentitySurface = typeof CANONICAL_IDENTITY_SURFACES[number];

export function assertEnvelopeHashSurfaceSetInvariant(envelope: SnapshotEnvelope): void {
  const envelopeKeys = new Set(Object.keys(envelope));
  const missing: string[] = [];
  const renamed: string[] = [];

  for (const surface of CANONICAL_IDENTITY_SURFACES) {
    if (!envelopeKeys.has(surface)) {
      missing.push(surface);
    }
  }

  if (missing.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_IDENTITY_SURFACE_DRIFT,
      message: `Identity-surface membership drift: missing surfaces [${missing.join(', ')}]. ` +
        `Canonical set: [${CANONICAL_IDENTITY_SURFACES.join(', ')}]. ` +
        `Contract: ${IDENTITY_SURFACE_SET_CONTRACT_VERSION}`,
      stage: 'envelopeIdentitySurfaceValidation',
      contractVersion: IDENTITY_SURFACE_SET_CONTRACT_VERSION
    });
  }

  // Verify all identity surfaces are non-empty strings (no silent erasure)
  for (const surface of CANONICAL_IDENTITY_SURFACES) {
    const value = (envelope as any)[surface];
    if (typeof value !== 'string' || value.length === 0) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.SNAPSHOT_ENVELOPE_IDENTITY_SURFACE_DRIFT,
        message: `Identity-surface "${surface}" has invalid value: expected non-empty string, got ${typeof value}. ` +
          `Contract: ${IDENTITY_SURFACE_SET_CONTRACT_VERSION}`,
        stage: 'envelopeIdentitySurfaceValidation',
        contractVersion: IDENTITY_SURFACE_SET_CONTRACT_VERSION
      });
    }
  }
}
