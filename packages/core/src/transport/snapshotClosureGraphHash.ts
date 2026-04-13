import * as crypto from 'node:crypto';
import { PolicyStackEntry } from '../policy/types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { SnapshotEnvelope } from './types.js';

export const SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION = 'v3';

export function computeSnapshotClosureGraphHash(
  entries: PolicyStackEntry[], 
  seamFingerprints?: string[],
  closureProvenance?: {
    manifestContentHash: string;
    signatureDigest: string;
    registryTrustRootId: string;
  }
): string {
  const policies = entries.map(e => ({
    id: `${e.policyNamespace}/${e.policyId}@${e.config.version || 1}`,
    closureHash: e.executionMetadata?.capabilityClosureHash || 'none'
  })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const payload: any = { policies };

  if (seamFingerprints && seamFingerprints.length > 0) {
    // Sort fingerprints deterministically
    const canonicalFingerprints = [...seamFingerprints].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    payload.seamFingerprints = canonicalFingerprints;
  }

  // F-7: Append provenance envelope identity material into the closure graph input.
  if (closureProvenance) {
    // trustRootEpoch is lifecycle metadata only.
    // It MUST NOT participate in closure identity, fingerprint identity,
    // replay acceptance logic, or closure hash computation.
    payload.closureProvenance = {
      manifestContentHash: closureProvenance.manifestContentHash,
      signatureDigest: closureProvenance.signatureDigest,
      registryTrustRootId: closureProvenance.registryTrustRootId
    };
  }

  // Phase 4.9: Use stableCanonicalStringify for mechanically enforced key ordering
  const canonicalString = stableCanonicalStringify(payload);
  
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function validateSnapshotClosureGraphDivergence(
  snapshotHash: string,
  runtimeHash: string,
  snapshotVersion: string = SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION,
  runtimeVersion: string = SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION
): void {
  // strict version rejection
  if (snapshotVersion !== runtimeVersion) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_CLOSURE_GRAPH_DIVERGENCE,
      message: `Snapshot closure graph identity contract version divergence: snapshot=${snapshotVersion}, runtime=${runtimeVersion}. Hybrid execution blocked.`,
      stage: 'snapshotReplayValidation',
      contractVersion: runtimeVersion,
      snapshotClosureGraphHash: snapshotHash
    });
  }

  if (snapshotHash !== runtimeHash) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.SNAPSHOT_CLOSURE_GRAPH_DIVERGENCE,
      message: 'Snapshot closure graph signature diverged from current runtime topology.',
      stage: 'snapshotReplayValidation',
      contractVersion: SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION,
      snapshotClosureGraphHash: snapshotHash
    });
  }
}

export interface ReplayMismatchReport {
  manifestMismatch?: boolean;
  signatureMismatch?: boolean;
  trustRootMismatch?: boolean;
  trustRootEpochMismatch?: boolean;
  closureGraphVersionMismatch?: boolean;
  overlayStackMismatch?: boolean;
}

/**
 * Pure diagnostic boundary for explaining replay divergences.
 * STRICTLY envelope-bounded: NEVER resolves lifecycle truth.
 * Execution truth = closure identity
 * Diagnostic truth = envelope delta
 * Lifecycle truth = registry context (AVOID)
 */
export function explainReplayMismatch(
  snapshotEnvelope: SnapshotEnvelope,
  runtimeEnvelope: SnapshotEnvelope
): ReplayMismatchReport {
  const report: ReplayMismatchReport = {};

  if (snapshotEnvelope.closureGraphContractVersion !== runtimeEnvelope.closureGraphContractVersion) {
    report.closureGraphVersionMismatch = true;
  }

  // Check Stack
  if (snapshotEnvelope.policyStackFingerprint !== runtimeEnvelope.policyStackFingerprint) {
    report.overlayStackMismatch = true;
  }

  // Provenance Boundary Checks
  if (snapshotEnvelope.closureProvenance && runtimeEnvelope.closureProvenance) {
    if (snapshotEnvelope.closureProvenance.manifestContentHash !== runtimeEnvelope.closureProvenance.manifestContentHash) {
      report.manifestMismatch = true;
    }
    if (snapshotEnvelope.closureProvenance.signatureDigest !== runtimeEnvelope.closureProvenance.signatureDigest) {
      report.signatureMismatch = true;
    }
    if (snapshotEnvelope.closureProvenance.registryTrustRootId !== runtimeEnvelope.closureProvenance.registryTrustRootId) {
      report.trustRootMismatch = true; 
    }
    if (snapshotEnvelope.closureProvenance.trustRootEpoch !== runtimeEnvelope.closureProvenance.trustRootEpoch) {
      report.trustRootEpochMismatch = true;
    }
  }

  return report;
}

