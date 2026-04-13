import { SnapshotEnvelope } from './types.js';
import { executeOverlaySeam } from '../topology/seamOrchestrator.js';

export interface ProvenanceExplainReport {
  manifestContentHash: string;
  signatureDigest: string;
  registryTrustRootId: string;
  trustRootEpoch: number;
  stackOrderingKeySummary: string; // The fingerprint hash is a summary surrogate for ordering
}

/**
 * Purely observational diagnostic surface.
 * MUST NOT participate in authority resolution, closure identity computation,
 * replay validation, or signature verification.
 */
export function explainClosureIdentity(envelope: SnapshotEnvelope): ProvenanceExplainReport | undefined {
  if (!envelope.closureProvenance) {
    return undefined; // No provenance layer exists (e.g. 0 overlays or failed execution mapping)
  }

  return {
    manifestContentHash: envelope.closureProvenance.manifestContentHash,
    signatureDigest: envelope.closureProvenance.signatureDigest,
    registryTrustRootId: envelope.closureProvenance.registryTrustRootId,
    trustRootEpoch: envelope.closureProvenance.trustRootEpoch || 0,
    stackOrderingKeySummary: envelope.snapshotClosureGraphHash // Serves as the canonical bounding key 
  };
}
